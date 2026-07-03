/**
 * Пост «Автобусы на Сабантуй — 4 июля» для раздела «Новости» (заявка владельца
 * 2026-07-03): текст оргкомитета + брендовые картинки расписания движения
 * автобусов Калинино — РМЗ (сгенерированы scripts/gen-bus-schedule.mjs из
 * графика АТП; данные времени — в этом же скрипте).
 *
 *   corepack pnpm -C web payload run src/seed/seedBusPost.ts
 *
 * Идемпотентно: Media по filename, пост по slug (SEED_FORCE=1 пересобирает —
 * правки текста этого поста делать В СИДЕ, /admin-правки перезапишутся force-ом).
 * Только ru (tt через fallback). Без миграций.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- seed-утилита: Payload data untyped */
import config from '@payload-config'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const log = (m: string) => console.log(m)

// ─── Lexical-конструктор (как в seedPrepPosts) ───────────────────────────────
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
const up = (mediaId: number | string): LexNode => ({
  type: 'upload',
  version: 3,
  relationTo: 'media',
  value: mediaId,
  id: `seed-up-${mediaId}`,
  fields: {},
  format: '',
})

// ─── Картинки расписания ─────────────────────────────────────────────────────
// v2: майдан праздника — у Поста ГАИ (не у РМЗ); имена версионные, потому что
// Media идемпотентен по filename и старые картинки иначе остались бы на проде.
const IMAGES: { file: string; alt: string }[] = [
  { file: 'bus-cover-v2.jpg', alt: 'Автобусы на Сабантуй 4 июля 2026 — до майдана у Поста ГАИ со всего города' },
  { file: 'bus-1-vyezd-v2.jpg', alt: 'Расписание автобусов на Сабантуй 4 июля — 1-й выезд, утро: РМЗ — Чехова — Центр — АТП — Калинино — Пост ГАИ (майдан) и обратно' },
  { file: 'bus-2-vyezd-v2.jpg', alt: 'Расписание автобусов на Сабантуй 4 июля — 2-й выезд, день и вечер: РМЗ — Чехова — Центр — АТП — Калинино — Пост ГАИ (майдан) и обратно' },
]

// ─── Тело поста (текст владельца 2026-07-03, поправлены только пробелы) ─────
function busBody(img: Record<string, number | string>): unknown {
  return doc(
    p('🎉 Отличные новости для всех гостей Сабантуя в Малмыжском районе! 🎉'),
    p('Подготовка к празднику идёт полным ходом, и мы позаботились о том, чтобы добраться до места торжества было максимально удобно.'),
    p('🚌 К месту проведения Сабантуя открыты дополнительные рейсы автобусов! Теперь каждый сможет без труда присоединиться к яркому и масштабному празднику.'),
    p('📍 Автобусы будут курсировать по удобным маршрутам с увеличенной частотой — чтобы никто не опоздал к самым интересным событиям: «Национальному подворью», «Городу мастеров», Детскому Сабантую, площадке волейбольных баталий, конным скачкам и главному майдану.'),
    h2('Расписание движения автобусов'),
    p('**Праздник проходит на майдане у Поста ГАИ.** Автобусы идут к нему со всего города: **РМЗ → Чехова → Центр → АТП → Калинино → Пост ГАИ (майдан)** — и обратно тем же путём. Нажмите на таблицу, чтобы увеличить.'),
    up(img['bus-1-vyezd-v2.jpg']),
    up(img['bus-2-vyezd-v2.jpg']),
    ul([
      '🚏 **На праздник:** автобусы отправляются от РМЗ в 7:37, 8:39, 9:41, 10:43, 11:45, 12:47, затем 13:40, 14:40, 16:29 и 17:33 — и прибывают к майдану у Поста ГАИ через полчаса (в 8:07, 9:09, 10:11 и так далее). Самый первый рейс подъезжает к Посту ГАИ уже в 7:05.',
      '🔙 **С праздника:** отправление от Поста ГАИ в 7:06, 8:08, 9:10, 10:12, 11:14, 12:16, 13:18, далее 14:09, 15:11, 15:53 и последний — в **16:55**.',
      '⚠️ Пометки «верх» и «низ» — посадка и высадка на верхней или нижней площадке у РМЗ.',
    ]),
    p('✨ Более **1000 участников творческих коллективов**, включая звёзд татарской эстрады — дуэт Рамазановых, — уже готовятся подарить вам незабываемые эмоции. Не пропустите этот праздник дружбы, традиций и веселья!'),
    p('📅 Сохраняйте расписание, делитесь с близкими — и до встречи на Сабантуе! 🥳'),
    p('#Сабантуй #МалмыжскийРайон #ПраздникДляВсех'),
  )
}

// ─── Run ──────────────────────────────────────────────────────────────────────
const SLUG = 'avtobusy-na-sabantuy-4-iyulya'
const payload = await getPayload({ config })
const force = process.env.SEED_FORCE === '1'

const imgIds: Record<string, number | string> = {}
for (const im of IMAGES) {
  const found = await payload.find({
    collection: 'media',
    where: { filename: { equals: im.file } },
    limit: 1,
    overrideAccess: true,
  })
  if (found.totalDocs > 0) {
    imgIds[im.file] = found.docs[0].id
    log(`= ${im.file} уже в Media (id=${found.docs[0].id})`)
  } else {
    const created = await payload.create({
      collection: 'media',
      data: { alt: im.alt } as any,
      filePath: path.resolve(dirname, 'assets', 'bus', im.file),
      overrideAccess: true,
    })
    imgIds[im.file] = created.id
    log(`✓ ${im.file} загружен в Media (id=${created.id})`)
  }
}

const data = {
  title: 'Автобусы на Сабантуй: расписание движения 4 июля',
  excerpt:
    'К майдану у Поста ГАИ открыты дополнительные рейсы со всего города! Первый автобус прибывает к празднику в 7:05, последний уходит с майдана в 16:55.',
  body: busBody(imgIds),
  cover: imgIds['bus-cover-v2.jpg'],
  publishedAt: '2026-07-03T17:40:00.000Z',
}

const existing = await payload.find({
  collection: 'news',
  where: { slug: { equals: SLUG } },
  limit: 1,
  overrideAccess: true,
})
if (existing.totalDocs > 0) {
  if (force) {
    await payload.update({ collection: 'news', id: existing.docs[0].id, data: data as any, locale: 'ru', overrideAccess: true })
    log(`↻ /novosti/${SLUG} обновлён (SEED_FORCE)`)
  } else {
    log(`= /novosti/${SLUG} уже есть — не трогаю (SEED_FORCE=1 для пересборки)`)
  }
} else {
  await payload.create({
    collection: 'news',
    data: { ...data, slug: SLUG, _status: 'published' } as any,
    locale: 'ru',
    overrideAccess: true,
  })
  log(`✓ /novosti/${SLUG} создан`)
}

// Уборка картинок v1 (направления были перепутаны: майдан — у Поста ГАИ, не у
// РМЗ) — чтобы они не висели в /mediateka. Пост уже пересобран на v2.
for (const old of ['bus-cover.jpg', 'bus-1-vyezd.jpg', 'bus-2-vyezd.jpg']) {
  const found = await payload.find({
    collection: 'media',
    where: { filename: { equals: old } },
    limit: 1,
    overrideAccess: true,
  })
  if (found.totalDocs > 0) {
    await payload.delete({ collection: 'media', id: found.docs[0].id, overrideAccess: true })
    log(`✗ ${old} (v1) удалён из Media`)
  }
}

log('Готово: пост про автобусы.')
process.exit(0)
