import { randomBytes, timingSafeEqual } from 'node:crypto'

import type { Where } from 'payload'

// Чистая логика приёмника ВК-конвейера Сарафана (D-093), вынесенная из
// route.ts, чтобы проверяться тестами без БД и HTTP. Калька с Казанской
// (web/src/lib/ingest.ts у них): контракт у трёх приёмников один, чтобы
// Сарафан включал сайт строкой в конфиге, а не отдельным кодом.
//
// Отличия от Казанской — только в форме нашей коллекции `news`:
//   - рубрика одна (владелец 14.09: «в новости Сабантуя в ленту новостей»),
//     поле `rubric` в коллекции не заводим; чужой slug — warning, не ошибка;
//   - видео идут в массив `videos` (у нас на странице новости он рендерится
//     плеером), а не link-узлами в текст;
//   - галереи нет: первое медиа — обложка, остальные — upload-узлы в теле.
//
// Две грабли вМалмыже 03.08, из-за которых логика вынесена и покрыта тестами:
// `draft: false` не публикует (состояние берётся из `_status`), и флаг publish
// принимался у любого держателя ключа доставки. Ни одна не ловится типами.

export type LexNode = { [k: string]: unknown; type: string; version: number }

const MAX_VIDEOS = 5

// Единственная рубрика ленты. Сарафан присылает `section` (портал) или
// `rubric` (Казанская) — принимаем оба имени, значение сверяем с этим списком.
const RUBRICS = ['news'] as const
export type Rubric = (typeof RUBRICS)[number]

const textNode = (text: string): LexNode => ({
  type: 'text',
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text,
  version: 1,
})

const paragraph = (children: LexNode[]): LexNode => ({
  type: 'paragraph',
  direction: null,
  format: '' as const,
  indent: 0,
  version: 1,
  children,
})

// Картинка внутри текста: узел `upload` (схема Payload 3, version 3),
// ссылается на media-документ, куда приёмник переложил файл из ВК (ВК-CDN
// протухает, G230). Официальный <RichText> рендерит его при depth ≥ 1.
const imageNode = (mediaId: number): LexNode => ({
  type: 'upload',
  version: 3,
  format: '' as const,
  id: randomBytes(12).toString('hex'),
  fields: {},
  relationTo: 'media' as const,
  value: mediaId,
})

// Текст + картинки → минимальный lexical richText. Картинки расставляются
// между абзацами равномерно; первое медиа — обложка, в текст не дублируется.
export const buildBody = (text: string, mediaIds: number[] = []) => {
  const paragraphs: LexNode[] = text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => paragraph([textNode(line)]))

  const inlineMedia = mediaIds.slice(1)
  const imagesByPos = new Map<number, LexNode[]>()
  if (paragraphs.length && inlineMedia.length) {
    inlineMedia.forEach((id, j) => {
      const pos = Math.min(
        Math.max(Math.ceil(((j + 1) * paragraphs.length) / (inlineMedia.length + 1)) - 1, 0),
        paragraphs.length - 1,
      )
      const bucket = imagesByPos.get(pos) ?? []
      bucket.push(imageNode(id))
      imagesByPos.set(pos, bucket)
    })
  }

  const children: LexNode[] = []
  paragraphs.forEach((p, i) => {
    children.push(p)
    const images = imagesByPos.get(i)
    if (images) children.push(...images)
  })
  // Без абзацев картинки всё равно нужно куда-то положить (пост из одних фото).
  if (!paragraphs.length) children.push(...inlineMedia.map(imageNode))

  return {
    root: {
      type: 'root',
      direction: null,
      format: '' as const,
      indent: 0,
      version: 1,
      children,
    },
  }
}

export type IncomingVideo = string | { url: string; title?: string }

export const normalizeVideos = (raw: unknown, warnings: string[]): { url: string; title?: string }[] => {
  if (!Array.isArray(raw)) return []
  const videos: { url: string; title?: string }[] = []
  for (const [index, item] of (raw as IncomingVideo[]).entries()) {
    if (videos.length >= MAX_VIDEOS) {
      warnings.push(`videos truncated to ${MAX_VIDEOS}`)
      break
    }
    const url = typeof item === 'string' ? item : item?.url
    if (!url || !/^https?:\/\//i.test(url)) {
      warnings.push(`video ${index}: invalid url`)
      continue
    }
    videos.push({ url, title: typeof item === 'object' ? item?.title : undefined })
  }
  return videos
}

// Рубрика от классификатора: у нас она одна, так что поле в документ не
// пишется. Неизвестный slug — не ошибка (черновик всё равно смотрит человек),
// но сигналим в ответе, чтобы промпт классификатора поправили.
export const normalizeRubric = (raw: unknown, warnings: string[]): Rubric | undefined => {
  if (typeof raw !== 'string' || !raw.trim()) return undefined
  const value = raw.trim()
  if ((RUBRICS as readonly string[]).includes(value)) return value as Rubric
  warnings.push(`unknown rubric: ${value}`)
  return undefined
}

// Constant-time сравнение секрета из заголовка с ожидаемым. Пустой env —
// «никого не пускать», а не «пускать всех».
export const secretMatches = (given: string, expected: string | undefined): boolean => {
  if (!expected) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Поиск уже принятого поста по ключу идемпотентности.
//
// ⚠️ Намеренно БЕЗ `draft: true` (класс G320): `find` с этим флагом читает
// таблицу версий, и у опубликованного поста с сохранённым поверх черновиком
// `_status` придёт `draft`. Решение «не трогать опубликованное» приняло бы
// такой пост за черновик и затёрло бы правки редактора. Нужен статус самой
// записи — значит, основная таблица.
export type ExistingPost = { id: number | string; _status?: string | null }

// Минимум от payload, который нужен приёмнику: так логику можно проверить без БД.
export type PostFinder = {
  find: (args: { collection: 'news'; where: Where; limit: number }) => Promise<{ docs: ExistingPost[] }>
}

export const findExistingPost = async (payload: PostFinder, vkPostId: string): Promise<ExistingPost | undefined> => {
  const res = await payload.find({
    collection: 'news',
    where: { 'source.vkPostId': { equals: vkPostId } },
    limit: 1,
  })
  return res.docs[0]
}

// Опубликованный пост приёмник не трогает: после публикации его правят руками,
// и повторная присылка того же vkPostId затёрла бы эти правки.
export const isPublished = (post: ExistingPost): boolean => post._status === 'published'

export type PostDataInput = {
  title: string
  text: string
  vkPostId: string
  sourceUrl: string
  publish: boolean
  videos: { url: string; title?: string }[]
  mediaIds: number[]
  date?: string
  publishedAt?: string
}

// Тело документа для payload.create/update.
// ⚠️ `_status` — не украшение: при versions.drafts состояние берётся отсюда,
// аргумент `draft` сам по себе не публикует.
export const buildPostData = (input: PostDataInput) => ({
  ...(input.publish ? { _status: 'published' as const } : {}),
  title: input.title,
  // Анонс в ленте — первый абзац; иначе карточка новости в списке пустая.
  excerpt: input.text.split(/\r?\n+/).map((s) => s.trim()).find(Boolean)?.slice(0, 300) || undefined,
  // Дата публикации = дата оригинала, если её прислали: иначе хук
  // populatePublishedAt проставит «сегодня», и старая новость выглядела бы свежей.
  publishedAt: input.publishedAt || input.date || undefined,
  body: input.text || input.mediaIds.length > 1 ? buildBody(input.text, input.mediaIds) : undefined,
  cover: input.mediaIds[0],
  videos: input.videos.length ? input.videos.map((v) => ({ url: v.url, title: v.title || undefined })) : undefined,
  source: { vkPostId: input.vkPostId, sourceUrl: input.sourceUrl },
})
