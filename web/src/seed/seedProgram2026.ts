/**
 * РЕАЛЬНАЯ программа Сабантуя-2026 — официальное расписание оргкомитета
 * (афиша + текст, переданы владельцем 2026-07-02; ИЗМЕНЕНИЯ по обновлённой
 * афише от 2026-07-03: спорт раньше — мини-футбол 9:00, футбол 11:00,
 * стадион = городской; дуа 12:00, пролог 12:10, открытие 12:25, скачки/
 * коллективы/состязания 13:00, награждение 17:00. Прогонять с SEED_FORCE=1).
 *
 *   corepack pnpm -C web payload run src/seed/seedProgram2026.ts
 *
 * Заменяет демо-программу: создаёт события p2026-* и УДАЛЯЕТ события demo-*
 * (план lib/festival.ts: «орги дают расписание → DEMO_SCHEDULE=false + удалить
 * demo-*»). Удаление — только слагов с префиксом demo- (наш сид-контент,
 * пользовательских данных в events нет).
 *
 * Идемпотентно: существующие по slug пропускаются; SEED_FORCE=1 — обновить.
 * Обычные записи коллекции Events — миграций схемы НЕ нужно.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- seed-утилита: Payload data untyped */
import config from '@payload-config'
import { getPayload } from 'payload'

// 4 июля 2026, время московское (Кировская область = МСК).
const DAY = '2026-07-04'
const at = (hhmm: string) => `${DAY}T${hhmm}:00.000+03:00`

type Ev = {
  slug: string
  title: string
  summary: string
  start: string
  end?: string
  venue: string
  category: 'ceremony' | 'concert' | 'sport' | 'kids' | 'food' | 'crafts' | 'other'
}

const EVENTS: Ev[] = [
  {
    slug: 'p2026-voleybol',
    title: 'Волейбольный турнир',
    summary: 'Волейбольные баталии на майдане — команды района и гостей.',
    start: at('10:00'),
    end: at('13:00'),
    venue: 'Майдан',
    category: 'sport',
  },
  {
    slug: 'p2026-podvorye',
    title: 'Национальное подворье, фотозоны, город мастеров',
    summary: 'Презентация и работа открытых выставочных площадок: национальное подворье, фотозоны, город мастеров.',
    start: at('10:00'),
    end: at('17:00'),
    venue: 'Национальное подворье',
    category: 'crafts',
  },
  {
    slug: 'p2026-konnye-zabegi',
    title: 'Конные забеги',
    summary: 'Утренние конные забеги — первая часть конной программы праздника.',
    start: at('10:00'),
    end: at('11:30'),
    venue: 'Скаковое поле',
    category: 'sport',
  },
  {
    slug: 'p2026-detskiy-sabantuy',
    title: '«Детский Сабантуй»',
    summary: 'Игры, забавы и состязания для самых маленьких гостей праздника.',
    start: at('10:30'),
    end: at('12:30'),
    venue: 'Детская поляна',
    category: 'kids',
  },
  {
    slug: 'p2026-dua',
    title: 'Дуа (молитва)',
    summary: 'Традиционная молитва перед началом праздника.',
    start: at('12:00'),
    end: at('12:10'),
    venue: 'Майдан',
    category: 'ceremony',
  },
  {
    slug: 'p2026-skazka-tukay',
    title: 'Сказка по мотивам произведений Габдуллы Тукая',
    summary: 'Пролог праздника: встреча с любимыми героями Тукая и большой хоровод.',
    start: at('12:10'),
    end: at('12:25'),
    venue: 'Главная сцена',
    category: 'kids',
  },
  {
    slug: 'p2026-otkrytie',
    title: 'Торжественное открытие праздника',
    summary: 'Официальное открытие Сабантуя-2026 — праздника дружбы, труда и единства.',
    start: at('12:25'),
    end: at('13:00'),
    venue: 'Главная сцена',
    category: 'ceremony',
  },
  {
    slug: 'p2026-skachki',
    title: 'Конные скачки',
    summary: 'Главная конная забава Сабантуя — резвость коней и удаль наездников.',
    start: at('13:00'),
    end: at('14:30'),
    venue: 'Скаковое поле',
    category: 'sport',
  },
  {
    slug: 'p2026-kollektivy',
    title: 'Выступления творческих коллективов',
    summary:
      'Коллективы Балтасинского и Малмыжского районов, заслуженные артисты Республик Башкортостан и Татарстан; специальные гости — семейный дуэт татарской эстрады Зинира и Ризат Рамазановы (г. Казань).',
    start: at('13:00'),
    end: at('15:00'),
    venue: 'Главная сцена',
    category: 'concert',
  },
  {
    slug: 'p2026-sostyazaniya',
    title: 'Спортивные состязания и национальные игры',
    summary: 'Көрәш, столб с призом, бег в мешках и другие традиционные забавы майдана.',
    start: at('13:00'),
    end: at('17:00'),
    venue: 'Майдан',
    category: 'sport',
  },
  {
    slug: 'p2026-mini-futbol',
    title: 'Турнир по мини-футболу',
    summary: 'Утренний турнир по мини-футболу на городском стадионе Малмыжа.',
    start: at('09:00'),
    end: at('11:00'),
    venue: 'Городской стадион',
    category: 'sport',
  },
  {
    slug: 'p2026-futbol',
    title: 'Турнир по футболу',
    summary: 'Турнир по футболу на городском стадионе Малмыжа.',
    start: at('11:00'),
    end: at('14:00'),
    venue: 'Городской стадион',
    category: 'sport',
  },
  {
    slug: 'p2026-nagrazhdenie',
    title: 'Награждение победителей спортивных мероприятий',
    summary: 'Чествование батыров и победителей всех состязаний дня.',
    start: at('17:00'),
    end: at('18:00'),
    venue: 'Главная сцена',
    category: 'ceremony',
  },
  {
    slug: 'p2026-koncert-cks',
    title: 'Концерт творческих коллективов',
    summary: 'Выступают коллективы Калининской ЦКС и молодёжные коллективы.',
    start: at('19:00'),
    end: at('19:30'),
    venue: 'Главная сцена',
    category: 'concert',
  },
  {
    slug: 'p2026-rozygrysh',
    title: 'Розыгрыш подарков',
    summary: 'Праздничный розыгрыш подарков среди гостей Сабантуя.',
    start: at('19:30'),
    end: at('20:00'),
    venue: 'Главная сцена',
    category: 'other',
  },
  {
    slug: 'p2026-koncert-avstraliya',
    title: 'Концерт кавер-группы «АВСТРАЛИЯ»',
    summary: 'Вечерний концерт кавер-группы «АВСТРАЛИЯ» (г. Казань) — завершение праздника.',
    start: at('21:00'),
    end: at('23:00'),
    venue: 'Главная сцена',
    category: 'concert',
  },
]

const payload = await getPayload({ config })
const log = (...a: unknown[]) => payload.logger.info(a.map(String).join(' '))
const force = process.env.SEED_FORCE === '1'

// 1. Реальные события (идемпотентно по slug).
let created = 0
let skipped = 0
for (const e of EVENTS) {
  const existing = await payload.find({
    collection: 'events',
    where: { slug: { equals: e.slug } },
    limit: 1,
    overrideAccess: true,
  })
  const data = {
    title: e.title,
    summary: e.summary,
    startDate: e.start,
    endDate: e.end,
    venue: e.venue,
    location: 'Малмыжский район, Калининское сельское поселение, за постом ГИБДД',
    category: e.category,
    registrationEnabled: false,
    _status: 'published',
    publishedAt: e.start,
    slug: e.slug,
  }
  if (existing.totalDocs > 0) {
    if (!force) {
      skipped++
      continue
    }
    await payload.update({ collection: 'events', id: existing.docs[0].id, data: data as any, overrideAccess: true })
    log(`↻ ${e.slug} обновлено`)
    continue
  }
  await payload.create({ collection: 'events', data: data as any, overrideAccess: true })
  created++
  log(`✓ ${e.title} (${e.slug}) — ${e.venue}`)
}

// 2. Демо-события (slug demo-*) — удаляем: реальная программа их заменяет.
const demo = await payload.find({
  collection: 'events',
  where: { slug: { like: 'demo-' } },
  limit: 100,
  pagination: false,
  overrideAccess: true,
})
let removed = 0
for (const d of demo.docs) {
  if (!String(d.slug || '').startsWith('demo-')) continue // like — подстрока, страхуемся префиксом
  await payload.delete({ collection: 'events', id: d.id, overrideAccess: true })
  removed++
  log(`✗ demo удалено: ${d.slug}`)
}

log(
  `Готово. Реальная программа-2026: создано ${created}, пропущено ${skipped} (всего ${EVENTS.length}); demo удалено: ${removed}. Дата: ${DAY}.`,
)
process.exit(0)
