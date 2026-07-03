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
// v2 — обновлённая афиша оргкомитета от 2026-07-03 («изменения в программе»):
// спорт раньше (мини-футбол 9:00, футбол 11:00), открытие 12:25, блок 13:00.
// Имя версионное: Media идемпотентен по filename.
const POSTER = 'afisha-sabantuy-2026-v2.jpg'
const POSTER_OLD = 'afisha-sabantuy-2026.jpg'

// ─── Русский контент (официальная программа оргкомитета, 2026-07-02) ─────────
const TITLE_RU = 'Программа Сабантуя — 4 июля 2026'
const EXCERPT_RU =
  'Праздник дружбы, труда и единства! Полная программа дня: спорт с 9:00, площадки и конные забеги с 10:00, ' +
  'торжественное открытие в 12:25, скачки и концерты с 13:00, вечером — розыгрыш подарков и кавер-группа «АВСТРАЛИЯ».'
const BODY_RU = doc(
  p('❗ **Обновлено 3 июля:** в программу внесены изменения — ниже актуальное расписание.'),
  p('🎉 Приглашаем всех на традиционный **Сабантуй** — праздник дружбы, труда и единства! Вас ждёт насыщенная программа:'),
  h2('Программа праздника'),
  ul([
    '⚽ **9:00** — турнир по мини-футболу (городской стадион)',
    '🏐 **10:00** — волейбольный турнир (майдан)',
    '🏡 **10:00** — национальное подворье, фотозоны, город мастеров',
    '🐴 **10:00** — конные забеги',
    '👶 **10:30** — «Детский Сабантуй»',
    '⚽ **11:00** — турнир по футболу (городской стадион)',
    '🤲 **12:00** — дуа (молитва)',
    '📖 **12:10** — пролог: сказка по мотивам произведений Габдуллы Тукая — встреча с любимыми героями и большой хоровод',
    '🎪 **12:25** — торжественное открытие праздника',
    '🏇 **13:00** — конные скачки',
    '🎵 **13:00** — выступления творческих коллективов Балтасинского и Малмыжского районов, заслуженных артистов Республик Башкортостан и Татарстан, семейный дуэт татарской эстрады Зинира и Ризат Рамазановы (г. Казань)',
    '🤼 **13:00** — спортивные состязания и национальные игры',
    '🏆 **17:00** — награждение победителей спортивных мероприятий',
    '🎤 **19:00** — концерт творческих коллективов Калининской ЦКС и других молодёжных коллективов',
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
  'Дуслык, хезмәт һәм бердәмлек бәйрәме! Көннең тулы программасы: 9:00дән спорт, 10:00дән мәйданчыклар һәм ат йөгерешләре, ' +
  '12:25тә тантаналы ачылу, кичен — бүләкләр уйнатуы һәм «АВСТРАЛИЯ» кавер-төркеме концерты.'
const BODY_TT = doc(
  p('❗ **3 июльдә яңартылды:** программага үзгәрешләр кертелде — түбәндә актуаль расписание.'),
  p('🎉 Барыгызны да традицион **Сабантуйга** чакырабыз — дуслык, хезмәт һәм бердәмлек бәйрәменә! Сезне бай программа көтә:'),
  h2('Бәйрәм программасы'),
  ul([
    '⚽ **9:00** — мини-футбол турниры (шәһәр стадионы)',
    '🏐 **10:00** — волейбол турниры (мәйдан)',
    '🏡 **10:00** — милли ихата, фотозоналар, осталар шәһәре',
    '🐴 **10:00** — ат йөгерешләре',
    '👶 **10:30** — «Балалар Сабантуе»',
    '⚽ **11:00** — футбол турниры (шәһәр стадионы)',
    '🤲 **12:00** — дога',
    '📖 **12:10** — пролог: Габдулла Тукай әсәрләре буенча әкият — яраткан геройлар белән очрашу һәм зур түгәрәк уен',
    '🎪 **12:25** — бәйрәмне тантаналы ачу',
    '🏇 **13:00** — ат чабышлары',
    '🎵 **13:00** — Балтач һәм Малмыж районнары иҗат коллективлары, Башкортстан һәм Татарстан Республикаларының атказанган артистлары чыгышлары, татар эстрадасының гаилә дуэты Зинира һәм Ризат Рамазановлар (Казан)',
    '🤼 **13:00** — спорт ярышлары һәм милли уеннар',
    '🏆 **17:00** — спорт чаралары җиңүчеләрен бүләкләү',
    '🎤 **19:00** — Калинино ҮМС һәм башка яшьләр коллективлары концерты',
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

// 4. Пост «Внимание: изменения в программе!» (текст владельца 2026-07-03) —
// короткий анонс с обновлённой афишей; полное расписание — в посте программы
// и на главной. Идемпотентно по slug, SEED_FORCE=1 пересобирает.
const CHANGES_SLUG = 'izmeneniya-v-programme-2026'
const changesData = {
  title: '❗ Внимание: изменения в программе праздника!',
  excerpt:
    'Программа Сабантуя обновлена: спорт стартует раньше — мини-футбол в 9:00, футбол в 11:00; ' +
    'открытие праздника — в 12:25, скачки, концерт и состязания — с 13:00. Всех ждём на долгожданный праздник!',
  body: doc(
    p('❗❗❗ **Внимание! Изменения в программе!**'),
    p('Оргкомитет обновил расписание праздника. Главное, что поменялось:'),
    ul([
      '⚽ Спорт начинается раньше: **турнир по мини-футболу — в 9:00**, **турнир по футболу — в 11:00** (городской стадион).',
      '🤲 Дуа (молитва) — в **12:00**, пролог-сказка по Тукаю — в **12:10**.',
      '🎪 **Торжественное открытие праздника — в 12:25.**',
      '🏇 Конные скачки, выступления творческих коллективов и состязания майдана — с **13:00**.',
      '🏆 Награждение победителей спортивных мероприятий — в **17:00**.',
    ]),
    p('Вечерняя программа без изменений: 19:00 — концерт творческих коллективов, 19:30 — розыгрыш подарков, 21:00 — концерт кавер-группы «АВСТРАЛИЯ» (г. Казань).'),
    p('Актуальное расписание всегда на **главной странице сайта** — добавляйте события в «Мою программу», и трекер «Сейчас и далее» подскажет, что начинается. Обновлённая афиша — ниже.'),
    p('Всех ждём на долгожданный праздник! 🌸'),
  ),
  cover: mediaId,
  publishedAt: '2026-07-03T21:30:00.000+03:00',
}
const changesExisting = await payload.find({
  collection: 'news',
  where: { slug: { equals: CHANGES_SLUG } },
  limit: 1,
  overrideAccess: true,
})
if (changesExisting.totalDocs > 0) {
  if (force) {
    await payload.update({
      collection: 'news',
      id: changesExisting.docs[0].id,
      data: changesData as any,
      overrideAccess: true,
    })
    log(`↻ /novosti/${CHANGES_SLUG} обновлён (SEED_FORCE)`)
  } else {
    log(`= /novosti/${CHANGES_SLUG} уже есть — не трогаю`)
  }
} else {
  await payload.create({
    collection: 'news',
    data: { ...changesData, slug: CHANGES_SLUG, _status: 'published' } as any,
    overrideAccess: true,
  })
  log(`✓ /novosti/${CHANGES_SLUG} создан`)
}

// 5. Уборка афиши v1 (устаревшие времена) — чтобы не путала в /mediateka.
// Только под force: без него ru-пост не перевешивался на v2 и его обложка
// ещё может ссылаться на старую картинку.
const oldPoster = force
  ? await payload.find({
      collection: 'media',
      where: { filename: { equals: POSTER_OLD } },
      limit: 1,
      overrideAccess: true,
    })
  : { totalDocs: 0, docs: [] as { id: number | string }[] }
if (oldPoster.totalDocs > 0) {
  await payload.delete({ collection: 'media', id: oldPoster.docs[0].id, overrideAccess: true })
  log(`✗ ${POSTER_OLD} (v1) удалена из Media`)
}

log('Готово. Посты новостей опубликованы.')
process.exit(0)
