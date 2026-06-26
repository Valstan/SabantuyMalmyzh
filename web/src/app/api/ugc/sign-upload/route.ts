import { NextResponse } from 'next/server'

import { rateLimit } from '../../../../lib/rateLimit'
import {
  buildObjectKey,
  isAllowedMime,
  isS3Configured,
  presignUpload,
  publicUrl,
} from '../../../../lib/s3'

// Выдаёт браузеру presigned PUT-ссылку для прямой загрузки фото/видео в Object Storage,
// минуя наш слабый бокс (.claude/plans/sabantuy-ugc-feed.md). Сам файл сюда НЕ грузится —
// только метаданные (тип/размер). Ответ: { uploadUrl, objectKey, publicUrl }.
//
// AWS SDK + crypto → нужен node-рантайм; POST не кэшируется.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_PHOTO_MB = Number(process.env.UGC_MAX_PHOTO_MB) || 12
const MAX_VIDEO_MB = Number(process.env.UGC_MAX_VIDEO_MB) || 100
const RL_MAX = 30 // запросов на подпись
const RL_WINDOW_MS = 10 * 60 * 1000 // за 10 минут на IP

function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return headers.get('x-real-ip')?.trim() || 'unknown'
}

type Body = {
  kind?: unknown
  contentType?: unknown
  sizeBytes?: unknown
  phase?: unknown
}

export async function POST(req: Request) {
  const ip = clientIp(req.headers)
  const { ok, retryAfterMs } = rateLimit(`ugc-sign:${ip}`, RL_MAX, RL_WINDOW_MS)
  if (!ok) {
    const mins = Math.max(1, Math.ceil(retryAfterMs / 60_000))
    return NextResponse.json(
      { error: `Слишком много загрузок. Попробуйте через ${mins} мин.` },
      { status: 429 },
    )
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: 'Хранилище медиа пока не настроено. Загрузка временно недоступна.' },
      { status: 503 },
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос.' }, { status: 400 })
  }

  const kind = body.kind === 'photo' || body.kind === 'video' ? body.kind : null
  const contentType = typeof body.contentType === 'string' ? body.contentType : ''
  const sizeBytes = typeof body.sizeBytes === 'number' && body.sizeBytes > 0 ? body.sizeBytes : 0
  const phase = typeof body.phase === 'string' ? body.phase : 'misc'

  if (!kind) return NextResponse.json({ error: 'Тип должен быть photo или video.' }, { status: 400 })
  if (!isAllowedMime(kind, contentType)) {
    return NextResponse.json({ error: 'Неподдерживаемый формат файла.' }, { status: 400 })
  }
  const maxBytes = (kind === 'photo' ? MAX_PHOTO_MB : MAX_VIDEO_MB) * 1024 * 1024
  if (!sizeBytes || sizeBytes > maxBytes) {
    const mb = kind === 'photo' ? MAX_PHOTO_MB : MAX_VIDEO_MB
    return NextResponse.json({ error: `Файл слишком большой (максимум ${mb} МБ).` }, { status: 413 })
  }

  const objectKey = buildObjectKey({ kind, phase, mime: contentType })
  try {
    const uploadUrl = await presignUpload(objectKey, contentType)
    return NextResponse.json(
      { uploadUrl, objectKey, publicUrl: publicUrl(objectKey), maxBytes },
      { status: 200 },
    )
  } catch {
    return NextResponse.json({ error: 'Не удалось подготовить загрузку.' }, { status: 502 })
  }
}
