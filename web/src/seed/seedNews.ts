/**
 * Первый пост «Новостей праздника»: официальная программа Сабантуя-2026 + афиша.
 *
 *   corepack pnpm -C web payload run src/seed/seedNews.ts
 *
 * Контент — официальная программа оргкомитета (передана владельцем 2026-07-02,
 * афиша web/src/seed/assets/afisha-sabantuy-2026.jpg). Афиша загружается в Media
 * (filePath из чекаута; на проде файлы лягут в MEDIA_DIR) и ставится обложкой.
 *
 * Идемпотентно: пост по slug уже есть → ru-тело не трогается (правки в /admin
 * сохраняются), SEED_FORCE=1 перезаписывает осознанно; афиша в Media ищется по
 * filename и не дублируется. tt-черновик пишется при каждом прогоне (вычитка
 * носителем — PENDING). Без миграций внутри сида (таблицы news — 20260702_090000).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- seed-утилита: Payload data untyped */
import config from '@payload-config'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const log = (m: string) => console.log(m)

// ─── Lexical-конструктор (как в seedAnnouncement) ────────────────────────────
type LexNode = Record<string, unknown>

function inline(text: string): LexNode[] {
  const out: LexNode[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  const push = (t: string, bold: boolean) => {
    if (!t) return
    out.push({ type: 'text', text: t, version: 1, format: bold ? 1 : 0, style: '', mode: 'normal', detail: 0 })
  }
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index), false)
    push(m[1], true)
    last = m.index + m[0].length
  }
  push(text.slice(last), false)
  return out
}
const block = (type: string, extra: LexNode, children: LexNode[]): LexNode => ({
  type,
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  ...extra,
  children,
})
const p = (text: string): LexNode => block('paragraph', { textFormat: 0, textStyle: '' }, inline(text))
const h2 = (text: string): LexNode => block('heading', { tag: 'h2' }, inline(text))
const ul = (items: string[]): LexNode =>
  block(
    'list',
    { listType: 'bullet', start: 1, tag: 'ul' },
    items.map((t, i) => block('listitem', { value: i + 1 }, inline(t))),
  )
const doc = (...children: LexNode[]): unknown => ({
  root: { type: 'root', version: 1, format: '', indent: 0, direction: 'ltr', children },
})

const SLUG = 'programma-sabantuya-2026'
const POSTER = 'afisha-sabantuy-2026.jpg'

// ─── Русский контент (официальная программа оргкомитета, 2026-07-02) ─────────
const TITLE_RU = 'Программа Сабантуя — 4 июля 2026'
const EXCERPT_RU =
  'Праздник дружбы, труда и единства! Полная программа дня: волейбол и конные забеги с 10:00, ' +
  'торжественное открытие в 11:30, скачки и концерты, вечером — розыгрыш подарков и кавер-группа «АВСТРАЛИЯ».'
const BODY_RU = doc(
  p('🎉 Приглашаем всех на традиционный **Сабантуй** — праздник дружбы, труда и единства! Вас ждёт насыщенная программа:'),
  h2('Программа праздника'),
  ul([
    '🏐 **10:00** — волейбольный турнир',
    '🏡 **10:00** — национальное подворье, фотозоны, город мастеров',
    '🐴 **10:00** — конные забеги',
    '👶 **10:30** — «Детский Сабантуй»',
    '🤲 **11:00** — дуа (молитва)',
    '📖 **11:10** — пролог: сказка по мотивам произведений Габдуллы Тукая — встреча с любимыми героями и большой хоровод',
    '🎪 **11:30** — торжественное открытие праздника',
    '🏇 **12:00** — конные скачки',
    '🎵 **12:00** — выступления творческих коллективов Балтасинского и Малмыжского районов, семейный дуэт татарской эстрады Зинира и Ризат Рамазановы (г. Казань)',
    '⚽ **12:00** — спортивные состязания и национальные игры',
    '⚽ **13:00** — турнир по мини-футболу среди детей (центральный стадион г. Малмыжа)',
    '⚽ **14:00** — турнир по футболу среди взрослых (центральный стадион г. Малмыжа)',
    '🏆 **17:15** — награждение победителей спортивных мероприятий',
    '🎤 **19:00** — концерт творческих коллективов Калининской ЦКС и молодёжных коллективов',
    '🎁 **19:30** — розыгрыш подарков',
    '🎸 **21:00** — концерт кавер-группы «АВСТРАЛИЯ» (г. Казань)',
  ]),
  h2('Место проведения'),
  p('📍 **Малмыжский район, Кировская область**, Калининское сельское поселение, за постом ГИБДД.'),
  p('Приходите всей семьёй! Будет весело! 🌸'),
)

// ─── Татарский черновик (вычитка носителем — PENDING) ────────────────────────
const TITLE_TT = 'Сабантуй программасы — 2026 ел, 4 июль'
const EXCERPT_TT =
  'Дуслык, хезмәт һәм бердәмлек бәйрәме! Көннең тулы программасы: 10:00дән волейбол һәм ат чабышлары, ' +
  '11:30да тантаналы ачылу, кичен — бүләкләр уйнатуы һәм «АВСТРАЛИЯ» кавер-төркеме концерты.'
const BODY_TT = doc(
  p('🎉 Барыгызны да традицион **Сабантуйга** чакырабыз — дуслык, хезмәт һәм бердәмлек бәйрәменә! Сезне бай программа көтә:'),
  h2('Бәйрәм программасы'),
  ul([
    '🏐 **10:00** — волейбол турниры',
    '🏡 **10:00** — милли ихата, фотозоналар, осталар шәһәре',
    '🐴 **10:00** — ат йөгерешләре',
    '👶 **10:30** — «Балалар Сабантуе»',
    '🤲 **11:00** — дога',
    '📖 **11:10** — пролог: Габдулла Тукай әсәрләре буенча әкият — яраткан геройлар белән очрашу һәм зур түгәрәк уен',
    '🎪 **11:30** — бәйрәмне тантаналы ачу',
    '🏇 **12:00** — ат чабышлары',
    '🎵 **12:00** — Балтач һәм Малмыж районнары иҗат коллективлары чыгышлары, татар эстрадасының гаилә дуэты Зинира һәм Ризат Рамазановлар (Казан)',
    '⚽ **12:00** — спорт ярышлары һәм милли уеннар',
    '⚽ **13:00** — балалар арасында мини-футбол турниры (Малмыж шәһәренең үзәк стадионы)',
    '⚽ **14:00** — олылар арасында футбол турниры (Малмыж шәһәренең үзәк стадионы)',
    '🏆 **17:15** — спорт чаралары җиңүчеләрен бүләкләү',
    '🎤 **19:00** — Калинино ҮМС һәм яшьләр коллективлары концерты',
    '🎁 **19:30** — бүләкләр уйнатуы',
    '🎸 **21:00** — «АВСТРАЛИЯ» кавер-төркеме концерты (Казан)',
  ]),
  h2('Үткәрелү урыны'),
  p('📍 **Малмыж районы, Киров өлкәсе**, Калинино авыл җирлеге, ЮХИДИ посты артында.'),
  p('Бөтен гаиләгез белән килегез! Күңелле булачак! 🌸'),
)

// ─── Run ──────────────────────────────────────────────────────────────────────
const payload = await getPayload({ config })
const force = process.env.SEED_FORCE === '1'

// 1. Афиша → Media (по filename, без дублей). Payload может переименовать
// дубликат (afisha-sabantuy-2026-1.jpg) — ищем по префиксу.
let mediaId: number | string
const foundMedia = await payload.find({
  collection: 'media',
  where: { filename: { equals: POSTER } },
  limit: 1,
  overrideAccess: true,
})
if (foundMedia.totalDocs > 0) {
  mediaId = foundMedia.docs[0].id
  log(`= афиша уже в Media (id=${mediaId})`)
} else {
  const created = await payload.create({
    collection: 'media',
    data: { alt: 'Афиша: программа Сабантуя 4 июля 2026, Малмыжский район' } as any,
    filePath: path.resolve(dirname, 'assets', POSTER),
    overrideAccess: true,
  })
  mediaId = created.id
  log(`✓ афиша загружена в Media (id=${mediaId})`)
}

// 2. Пост новостей (ru), идемпотентно по slug.
const existing = await payload.find({
  collection: 'news',
  where: { slug: { equals: SLUG } },
  limit: 1,
  overrideAccess: true,
})

let id: number | string
if (existing.totalDocs > 0) {
  id = existing.docs[0].id
  if (force) {
    await payload.update({
      collection: 'news',
      id,
      data: { title: TITLE_RU, excerpt: EXCERPT_RU, body: BODY_RU, cover: mediaId } as any,
      overrideAccess: true,
    })
    log(`↻ ru /novosti/${SLUG} обновлён (SEED_FORCE)`)
  } else {
    log(`= /novosti/${SLUG} уже есть — ru-тело не трогаю (правки в /admin сохранены)`)
  }
} else {
  const created = await payload.create({
    collection: 'news',
    data: {
      title: TITLE_RU,
      slug: SLUG,
      excerpt: EXCERPT_RU,
      body: BODY_RU,
      cover: mediaId,
      _status: 'published',
      publishedAt: '2026-07-02T09:00:00.000+03:00',
    } as any,
    overrideAccess: true,
  })
  id = created.id
  log(`✓ ru /novosti/${SLUG} — «${TITLE_RU}»`)
}

// 3. tt-черновик пишем всегда (перезаписывает только tt, ru не трогает).
await payload.update({
  collection: 'news',
  id,
  locale: 'tt',
  data: { title: TITLE_TT, excerpt: EXCERPT_TT, body: BODY_TT } as any,
  overrideAccess: true,
})
log(`✓ tt /tt/novosti/${SLUG} — «${TITLE_TT}» (черновик)`)

log('Готово. Пост с программой опубликован.')
process.exit(0)
