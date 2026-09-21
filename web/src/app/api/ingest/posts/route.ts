import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import {
  buildPostData,
  findExistingPost,
  isPublished,
  normalizeRubric,
  normalizeVideos,
  secretMatches,
  type IncomingVideo,
} from '../../../../lib/ingest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Приёмник ВК-конвейера Сарафана (D-093, решение владельца 14.09: посты про
// Сабантуй из потока района — в нашу ленту новостей). Сайт — только приёмник:
// Сарафан присылает пост POST'ом, сайт в ВК сам не ходит.
//
// Контракт тот же, что у портала и Казанской (три одинаковых приёмника дешевле
// трёх разных): POST /api/ingest/posts, заголовок X-Gateway-Key (или Bearer), JSON:
// {
//   vkPostId:  string   — обязателен, ключ идемпотентности ("-12345_678")
//   sourceUrl: string   — обязателен, ссылка на оригинал (атрибуция)
//   title?:    string   — если нет, берём начало текста
//   text?:     string   — plain text поста, абзацы через \n
//   section?/rubric?: string — slug рубрики; у нас одна — "news"
//   date?:     string   — ISO-дата оригинального поста
//   images?:   Array<string | { url, alt? }>  — перекладываем к себе (ВК-CDN протухает)
//   videos?:   Array<string | { url, title? }> — не перекладываем, ссылка на плеер
//   publishedAt?: string
//   publish?:  boolean  — явная публикация вместо draft, требует X-Publish-Key
// }
//
// Секреты (#008, env бокса + зеркало в своей комнате vault):
//   INGEST_GATEWAY_KEY — право присылать. Отдаётся Сарафану grant'ом под именем
//     SABANTUY_INGEST_KEY (конвенция <SITE>_INGEST_KEY).
//   INGEST_PUBLISH_KEY — право публиковать; без него `publish` игнорируется,
//     пост создаётся черновиком и в ответе идёт warning. На старте не выдан:
//     черновик по умолчанию, публикует человек (D-093).
// Повтор того же vkPostId не дублирует: draft обновляется, published не трогается.

type IncomingImage = string | { url: string; alt?: string }

const MAX_IMAGES = 10
const MAX_IMAGE_BYTES = 15 * 1024 * 1024
const FETCH_TIMEOUT_MS = 20_000

const mayPublish = (request: Request): boolean =>
  secretMatches(request.headers.get('x-publish-key') ?? '', process.env.INGEST_PUBLISH_KEY)

const isAuthorized = (request: Request): boolean => {
  const given =
    request.headers.get('x-gateway-key') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  return secretMatches(given, process.env.INGEST_GATEWAY_KEY)
}

const extFromMime = (mime: string): string =>
  ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[mime] ?? 'jpg'

export async function POST(request: Request): Promise<NextResponse> {
  // Без секрета в env → 503: эндпоинт «выключен», не «открыт» (как revalidate).
  if (!process.env.INGEST_GATEWAY_KEY) {
    return NextResponse.json({ error: 'ingest is not configured' }, { status: 503 })
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: {
    vkPostId?: string
    sourceUrl?: string
    title?: string
    text?: string
    section?: string
    rubric?: string
    date?: string
    images?: IncomingImage[]
    videos?: IncomingVideo[]
    publishedAt?: string
    publish?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const vkPostId = typeof body.vkPostId === 'string' ? body.vkPostId.trim() : ''
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : ''
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const title =
    (typeof body.title === 'string' && body.title.trim()) || (text ? `${text.slice(0, 80)}${text.length > 80 ? '…' : ''}` : '')

  if (!vkPostId) return NextResponse.json({ error: 'vkPostId is required' }, { status: 400 })
  if (!sourceUrl) return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 })
  if (!title) return NextResponse.json({ error: 'title or text is required' }, { status: 400 })

  const payload = await getPayload({ config })
  const warnings: string[] = []
  let publish = body.publish === true
  if (publish && !mayPublish(request)) {
    publish = false
    warnings.push('publish ignored: valid X-Publish-Key required, saved as draft')
  }
  const videos = normalizeVideos(body.videos, warnings)
  normalizeRubric(body.section ?? body.rubric, warnings)

  const existingPost = await findExistingPost(payload, vkPostId)

  if (existingPost && isPublished(existingPost)) {
    return NextResponse.json({ created: false, updated: false, id: existingPost.id, warnings }, { status: 200 })
  }

  const images = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : []
  if (Array.isArray(body.images) && body.images.length > MAX_IMAGES) warnings.push(`images truncated to ${MAX_IMAGES}`)
  const mediaIds: number[] = []
  for (const [index, image] of images.entries()) {
    const url = typeof image === 'string' ? image : image?.url
    const alt = typeof image === 'object' && image?.alt ? image.alt : title
    if (!url || !/^https?:\/\//i.test(url)) {
      warnings.push(`image ${index}: invalid url`)
      continue
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const mime = response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg'
      if (!mime.startsWith('image/')) throw new Error(`not an image: ${mime}`)
      const data = Buffer.from(await response.arrayBuffer())
      if (data.length > MAX_IMAGE_BYTES) throw new Error(`too large: ${data.length} bytes`)
      const media = await payload.create({
        collection: 'media',
        data: { alt },
        file: {
          data,
          mimetype: mime,
          name: `vk-${vkPostId.replace(/[^\w-]/g, '_')}-${index}.${extFromMime(mime)}`,
          size: data.length,
        },
      })
      mediaIds.push(media.id)
    } catch (error) {
      warnings.push(`image ${index}: ${error instanceof Error ? error.message : 'fetch failed'}`)
    }
  }

  const data = buildPostData({
    title,
    text,
    vkPostId,
    sourceUrl,
    publish,
    videos,
    mediaIds,
    date: body.date,
    publishedAt: body.publishedAt,
  })

  if (existingPost) {
    const updated = await payload.update({
      collection: 'news',
      id: existingPost.id,
      data: {
        ...data,
        ...(mediaIds.length ? {} : { cover: undefined }),
      },
      draft: !publish,
    })
    return NextResponse.json({ created: false, updated: true, published: publish, id: updated.id, warnings }, { status: 200 })
  }

  const created = await payload.create({ collection: 'news', data, draft: !publish })
  return NextResponse.json({ created: true, published: publish, id: created.id, warnings }, { status: 201 })
}
