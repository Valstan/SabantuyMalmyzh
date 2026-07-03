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
const IMAGES: { file: string; alt: string }[] = [
  { file: 'bus-cover.jpg', alt: 'Автобусы на Сабантуй 4 июля 2026 — маршрут Калинино — РМЗ (майдан)' },
  { file: 'bus-1-vyezd.jpg', alt: 'Расписание автобусов на Сабантуй 4 июля — 1-й выезд, утро: Пост ГАИ — Калинино — АТП — Центр — Чехова — РМЗ и обратно' },
  { file: 'bus-2-vyezd.jpg', alt: 'Расписание автобусов на Сабантуй 4 июля — 2-й выезд, день и вечер: Пост ГАИ — Калинино — АТП — Центр — Чехова — РМЗ и обратно' },
]

// ─── Тело поста (текст владельца 2026-07-03, поправлены только пробелы) ─────
function busBody(img: Record<string, number | string>): unknown {
  return doc(
    p('🎉 Отличные новости для всех гостей Сабантуя в Малмыжском районе! 🎉'),
    p('Подготовка к празднику идёт полным ходом, и мы позаботились о том, чтобы добраться до места торжества было максимально удобно.'),
    p('🚌 К месту проведения Сабантуя открыты дополнительные рейсы автобусов! Теперь каждый сможет без труда присоединиться к яркому и масштабному празднику.'),
    p('📍 Автобусы будут курсировать по удобным маршрутам с увеличенной частотой — чтобы никто не опоздал к самым интересным событиям: «Национальному подворью», «Городу мастеров», Детскому Сабантую, площадке волейбольных баталий, конным скачкам и главному майдану.'),
    h2('Расписание движения: Калинино — РМЗ (майдан)'),
    p('Маршрут: **Пост ГАИ → Калинино → АТП → Центр → Чехова → РМЗ (майдан)** — и обратно тем же путём. Нажмите на таблицу, чтобы увеличить.'),
    up(img['bus-1-vyezd.jpg']),
    up(img['bus-2-vyezd.jpg']),
    ul([
      '🚏 Первый автобус на майдан — в **7:06 от Поста ГАИ**, далее рейсы отправляются примерно раз в час: 8:08, 9:10, 10:12, 11:14, 12:16, затем 14:09, 15:11, 15:53 и 16:55.',
      '🔙 Последний обратный рейс уходит от РМЗ в **17:33** (низ) и прибывает к АТП в 17:48.',
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
    'К месту праздника открыты дополнительные рейсы! Маршрут Калинино — РМЗ (майдан): первый автобус в 7:06 от Поста ГАИ, последний обратный — в 17:33 от РМЗ.',
  body: busBody(imgIds),
  cover: imgIds['bus-cover.jpg'],
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

log('Готово: пост про автобусы.')
process.exit(0)
