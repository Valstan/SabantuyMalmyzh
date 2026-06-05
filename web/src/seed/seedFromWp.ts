/**
 * Перенос наработанного контента со старого WordPress-сайта (сабантуймалмыж.рф)
 * на новый стек. Идемпотентно: повторный запуск пропускает уже существующее
 * (по slug / по имени медиафайла). Запуск:
 *
 *   corepack pnpm -C web payload run src/seed/seedFromWp.ts
 *
 * Тянет через WP REST API (curl ломает кириллицу — здесь node fetch, UTF-8):
 *   • Страницы «О Сабантуй» (#56) и «Наши контакты» (#206) → коллекция Pages
 *   • Фотоотчёт «Сабантуй 2023» (post #1 / медиатека) → альбом Gallery
 *   • Афиша + программа 2024 (постеры) → альбом Gallery
 * Оригинальные даты публикаций сохраняются (publishedAt / date), чтобы сайт
 * выглядел наполненным, а не «только что созданным».
 *
 * Контент пишется в локаль ru (default). TT-переводы — позже, вручную в /admin.
 * Стоковые/тема-плейсхолдеры (pexels-*, kubio-image-*, demo-video*) НЕ переносятся.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- утилита-порт: вход — untyped WordPress REST JSON */
import config from '@payload-config'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { getPayload } from 'payload'

const WP = 'https://сабантуймалмыж.рф'

// ─── WP helpers ──────────────────────────────────────────────────────────────
async function wpJson<T = any>(endpoint: string): Promise<T> {
  const res = await fetch(`${WP}/wp-json/wp/v2/${endpoint}`)
  if (!res.ok) throw new Error(`WP ${endpoint} → ${res.status}`)
  return res.json() as Promise<T>
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#8217;/g, '’').replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—').replace(/&hellip;/g, '…')
    .replace(/&[a-z0-9#]+;/gi, ' ')

const stripInline = (html: string): string =>
  decodeEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()

// ─── HTML → Lexical (минимальный валидный editor-state) ──────────────────────
type LexNode = Record<string, unknown>
const textNode = (text: string): LexNode => ({
  type: 'text', text, version: 1, format: 0, style: '', mode: 'normal', detail: 0,
})
const paragraph = (text: string): LexNode => ({
  type: 'paragraph', version: 1, format: '', indent: 0, direction: 'ltr',
  textFormat: 0, textStyle: '', children: [textNode(text)],
})
const heading = (text: string, tag: 'h2' | 'h3'): LexNode => ({
  type: 'heading', tag, version: 1, format: '', indent: 0, direction: 'ltr',
  children: [textNode(text)],
})

function htmlToLexical(html: string): unknown {
  const children: LexNode[] = []
  // Блочные элементы по порядку появления.
  const blockRe = /<(h[1-4]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = blockRe.exec(html))) {
    const tag = m[1].toLowerCase()
    // Разбиваем <br> на отдельные абзацы внутри блока.
    const parts = m[2].split(/<br\s*\/?>/i).map(stripInline).filter(Boolean)
    for (const text of parts) {
      if (tag === 'h1' || tag === 'h2') children.push(heading(text, 'h2'))
      else if (tag === 'h3' || tag === 'h4') children.push(heading(text, 'h3'))
      else children.push(paragraph(text))
    }
  }
  if (children.length === 0) {
    const plain = stripInline(html)
    if (plain) children.push(paragraph(plain))
  }
  return {
    root: { type: 'root', version: 1, format: '', indent: 0, direction: 'ltr', children },
  }
}

// ─── download → tmp file ─────────────────────────────────────────────────────
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}
const translit = (s: string): string =>
  s.replace(/[а-яё]/gi, (ch) => {
    const lower = ch.toLowerCase()
    const t = TRANSLIT[lower] ?? ch
    return ch === lower ? t : t.charAt(0).toUpperCase() + t.slice(1)
  })

const asciiName = (url: string): string => {
  const raw = translit(decodeURIComponent(url.split('/').pop() || 'file'))
  const ext = (raw.match(/\.[a-z0-9]+$/i)?.[0] || '.jpg').toLowerCase()
  const base = raw.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return `${(base || 'file').slice(0, 60)}${ext}`
}

async function downloadToTmp(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${url} → ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const file = path.join(os.tmpdir(), `seed-${Date.now()}-${Math.round(performance.now())}-${asciiName(url)}`)
  await fs.writeFile(file, buf)
  return file
}

// ─── main ────────────────────────────────────────────────────────────────────
const payload = await getPayload({ config })
const log = (...a: unknown[]) => payload.logger.info(a.map(String).join(' '))

// 0. Локальный dev-админ (чтобы /admin был доступен; на проде админа заводит владелец)
{
  const existing = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
  if (existing.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: { email: 'admin@sabantuy.local', password: 'SabantuyDev!2026', name: 'Администратор', roles: ['admin'] } as any,
      overrideAccess: true,
    })
    log('✓ создан dev-админ admin@sabantuy.local')
  }
}

// media dedup: по имени файла (нормализованному)
const mediaCache = new Map<string, number>()
async function ensureMedia(sourceUrl: string, alt: string): Promise<number | null> {
  const key = asciiName(sourceUrl).toLowerCase().replace(/-scaled|-\d+(?=\.)/g, '')
  if (mediaCache.has(key)) return mediaCache.get(key)!
  // уже в БД?
  const fileName = asciiName(sourceUrl)
  const found = await payload.find({
    collection: 'media', where: { filename: { like: fileName.replace(/\.[a-z0-9]+$/i, '') } },
    limit: 1, overrideAccess: true,
  })
  if (found.totalDocs > 0) {
    const id = found.docs[0].id as number
    mediaCache.set(key, id)
    return id
  }
  try {
    const tmp = await downloadToTmp(sourceUrl)
    const doc = await payload.create({
      collection: 'media', data: { alt } as any, filePath: tmp, overrideAccess: true,
    })
    await fs.unlink(tmp).catch(() => {})
    mediaCache.set(key, doc.id as number)
    log(`  ↳ медиа: ${fileName}`)
    return doc.id as number
  } catch (e) {
    log(`  ⚠ не удалось загрузить ${fileName}: ${(e as Error).message}`)
    return null
  }
}

async function upsertPage(slug: string, title: string, html: string, isoDate: string) {
  const exists = await payload.find({ collection: 'pages', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
  if (exists.totalDocs > 0) { log(`= страница «${title}» уже есть`); return }
  await payload.create({
    collection: 'pages',
    data: { title, slug, content: htmlToLexical(html), _status: 'published', publishedAt: isoDate } as any,
    overrideAccess: true,
  })
  log(`✓ страница «${title}» (/${slug})`)
}

async function upsertGallery(
  slug: string, title: string, description: string, isoDate: string,
  photos: { id: number; caption?: string }[],
) {
  const exists = await payload.find({ collection: 'gallery', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
  if (exists.totalDocs > 0) { log(`= альбом «${title}» уже есть`); return }
  if (photos.length === 0) { log(`⚠ альбом «${title}» пропущен — нет фото`); return }
  await payload.create({
    collection: 'gallery',
    data: {
      title, slug, description, date: isoDate, publishedAt: isoDate, _status: 'published',
      coverImage: photos[0].id,
      photos: photos.map((p) => ({ image: p.id, caption: p.caption })),
    } as any,
    overrideAccess: true,
  })
  log(`✓ альбом «${title}» (/${slug}) — ${photos.length} фото`)
}

// 1. Страницы ──────────────────────────────────────────────────────────────
{
  const aboutP = await wpJson('pages/56')
  await upsertPage('o-sabantuy', 'О фестивале «Сабантуй»', aboutP.content.rendered, aboutP.date)

  const contactsP = await wpJson('pages/206')
  await upsertPage('kontakty', 'Наши контакты', contactsP.content.rendered, contactsP.date)

  // Политика обработки ПДн (152-ФЗ) — требование проекта (ссылка в подвале).
  // Плейсхолдер: владелец заменяет реквизитами оператора в /admin.
  const privacyHtml =
    '<h2>Политика обработки персональных данных</h2>' +
    '<p>Настоящая Политика определяет порядок обработки персональных данных посетителей сайта фестиваля «Сабантуй Малмыж» в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».</p>' +
    '<p>Оператор обрабатывает персональные данные (ФИО, контактный телефон, адрес электронной почты), предоставленные при подаче заявки на участие, исключительно в целях организации участия в мероприятиях фестиваля.</p>' +
    '<p>Данные хранятся на территории Российской Федерации и не передаются третьим лицам. Отправляя заявку, пользователь даёт согласие на обработку своих персональных данных.</p>' +
    '<p><em>Реквизиты оператора и контактные данные ответственного лица заполняются организатором.</em></p>'
  await upsertPage('privacy', 'Политика обработки персональных данных', privacyHtml, '2024-06-09T00:00:00.000Z')
}

// 2. Медиатека → категоризация ────────────────────────────────────────────
const media: any[] = await wpJson('media?per_page=100&orderby=date&order=asc')
const fnameOf = (m: any) => decodeURIComponent((m.source_url || '').split('/').pop() || '')
const isRealPhoto = (f: string) =>
  /\.(jpe?g)$/i.test(f) &&
  (/^IMG_\d/i.test(f) || /^\d{4}-\d{2}-\d{2}/.test(f) || /ish_sabantui/i.test(f) || /DSCF/i.test(f) || /^hero3/i.test(f)) &&
  !/pexels|television-camera|kubio|demo-video|логотип|logo/i.test(f)
const isPoster = (f: string) => /(афиша|программа).*2024/i.test(f) && /\.png$/i.test(f) && !/edited/i.test(f)

// 2a. Фотоотчёт «Сабантуй 2023» (дедуп дублей -1/-1-1/-scaled)
{
  const seen = new Set<string>()
  const picks: any[] = []
  for (const m of media) {
    const f = fnameOf(m)
    if (!isRealPhoto(f)) continue
    const norm = f.toLowerCase().replace(/-scaled/g, '').replace(/(-\d+)+(?=\.)/g, '').replace(/\.[a-z0-9]+$/i, '')
    if (seen.has(norm)) continue
    seen.add(norm); picks.push(m)
  }
  log(`фотоотчёт 2023: ${picks.length} уникальных фото из медиатеки`)
  const photoIds: { id: number; caption?: string }[] = []
  for (const m of picks) {
    const id = await ensureMedia(m.source_url, stripInline(m.alt_text || m.title?.rendered || 'Сабантуй в Малмыже'))
    if (id) photoIds.push({ id })
  }
  await upsertGallery(
    'sabantuy-2023',
    'Сабантуй 2023 в Малмыже. Как это было',
    'Фотоотчёт с регионального национального праздника «Сабантуй» 2023 года в Малмыже.',
    '2024-06-09T00:00:00.000Z',
    photoIds,
  )
}

// 2b. Афиша и программа 2024 (постеры)
{
  const posters = media.filter((m) => isPoster(fnameOf(m)))
  const photoIds: { id: number; caption?: string }[] = []
  for (const m of posters) {
    const f = fnameOf(m)
    const caption = /афиша/i.test(f) ? 'Афиша праздников · лето 2024' : 'Программа Сабантуй-2024 (29 июня)'
    const id = await ensureMedia(m.source_url, caption)
    if (id) photoIds.push({ id, caption })
  }
  await upsertGallery(
    'afisha-programma-2024',
    'Афиша и программа · лето 2024',
    'Афиша праздничных мероприятий Малмыжского района и программа Сабантуй-2024 (29 июня 2024 года).',
    '2024-06-17T00:00:00.000Z',
    photoIds,
  )
}

log('Готово. Контент перенесён.')
process.exit(0)
