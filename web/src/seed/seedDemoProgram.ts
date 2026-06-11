/**
 * Демо-программа фестиваля — микс-выборка по Сабантуям прошлых лет в Малмыже
 * (открытие, көрәш, скачки, столб, бои мешками, мотокросс, кухня, детский майдан,
 * гала-концерт, награждение батыра). Нужна, чтобы сайт выглядел живым ДО
 * объявления реальной программы. Дата уже официальная (4 июля 2026); на сайте
 * рядом с программой показывается предупреждение, что программа предварительная
 * (см. lib/festival.ts → FestivalNotice).
 *
 *   corepack pnpm -C web payload run src/seed/seedDemoProgram.ts
 *
 * Все события — на ОФИЦИАЛЬНУЮ дату праздника: 4 июля 2026 (объявлена
 * организаторами). Программа при этом остаётся предварительной. Слаги начинаются
 * с «demo-», чтобы их легко было найти и удалить, когда будет настоящая программа.
 *
 * Идемпотентно: существующие по slug пропускаются; SEED_FORCE=1 — обновить.
 * Создаёт обычные записи коллекции Events (без миграций схемы). Запускается и на
 * проде (это и есть демо-контент) через workflow seed-program.yml.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- seed-утилита: Payload data untyped */
import config from '@payload-config'
import { getPayload } from 'payload'

// Дата проведения: суббота 4 июля 2026 — объявлена организаторами (2026-06-11).
// Время по Москве (+03:00); в БД ляжет как UTC, на клиенте покажется в местном.
const DAY = '2026-07-04'
const at = (hhmm: string) => `${DAY}T${hhmm}:00.000+03:00`

type Ev = {
  slug: string
  title: string
  summary: string
  start: string
  end: string
  venue: string
  category: 'ceremony' | 'concert' | 'sport' | 'kids' | 'food' | 'crafts' | 'other'
}

const EVENTS: Ev[] = [
  {
    slug: 'demo-otkrytie',
    title: 'Торжественное открытие праздника',
    summary: 'Праздничное шествие, приветствия гостей и поднятие флага Сабантуя.',
    start: at('10:00'),
    end: at('10:30'),
    venue: 'Главная сцена',
    category: 'ceremony',
  },
  {
    slug: 'demo-koncert-otkrytie',
    title: 'Концерт творческих коллективов',
    summary: 'Песни и танцы народов Малмыжского края — татарские, русские, марийские, удмуртские.',
    start: at('10:30'),
    end: at('11:30'),
    venue: 'Главная сцена',
    category: 'concert',
  },
  {
    slug: 'demo-koresh-otbor',
    title: 'Көрәш: отборочные схватки',
    summary: 'Национальная борьба на поясах — путь к титулу батыра праздника.',
    start: at('11:00'),
    end: at('14:30'),
    venue: 'Майдан',
    category: 'sport',
  },
  {
    slug: 'demo-detskiy-maydan',
    title: 'Детский майдан: игры и забавы',
    summary: 'Бег в мешках, аттракционы, мастер-классы и сладости для самых маленьких гостей.',
    start: at('11:00'),
    end: at('16:00'),
    venue: 'Детская поляна',
    category: 'kids',
  },
  {
    slug: 'demo-skachki',
    title: 'Конные скачки',
    summary: 'Резвость коней и удаль наездников — одна из самых зрелищных забав Сабантуя.',
    start: at('12:00'),
    end: at('13:00'),
    venue: 'Поле у реки',
    category: 'sport',
  },
  {
    slug: 'demo-stolb',
    title: 'Лазание на столб за призом',
    summary: 'Кто доберётся до вершины высокого гладкого столба — тому и приз.',
    start: at('12:30'),
    end: at('13:00'),
    venue: 'Майдан',
    category: 'sport',
  },
  {
    slug: 'demo-boi-meshkami',
    title: 'Бои мешками на бревне',
    summary: 'Весёлое состязание на равновесие и ловкость — смеха больше, чем синяков.',
    start: at('13:00'),
    end: at('13:40'),
    venue: 'Майдан',
    category: 'sport',
  },
  {
    slug: 'demo-kuhnya-yarmarka',
    title: 'Национальная кухня и ярмарка ремёсел',
    summary: 'Чак-чак, эчпочмак, плов из казана, катык и изделия мастеров со всего района.',
    start: at('13:00'),
    end: at('17:00'),
    venue: 'Ярмарочная площадь',
    category: 'food',
  },
  {
    slug: 'demo-motokross',
    title: 'Мотокросс',
    summary: 'Скорость и драйв для любителей мотоспорта на специально подготовленной трассе.',
    start: at('13:30'),
    end: at('14:30'),
    venue: 'Поле за околицей',
    category: 'sport',
  },
  {
    slug: 'demo-koresh-final',
    title: 'Финал көрәш: определение батыра',
    summary: 'Решающие схватки и главный приз батыру праздника — по традиции барана.',
    start: at('15:00'),
    end: at('16:00'),
    venue: 'Майдан',
    category: 'sport',
  },
  {
    slug: 'demo-gala-koncert',
    title: 'Гала-концерт и народные гуляния',
    summary: 'Большой праздничный концерт, песни и пляски для всех гостей Сабантуя.',
    start: at('16:00'),
    end: at('17:30'),
    venue: 'Главная сцена',
    category: 'concert',
  },
  {
    slug: 'demo-nagrazhdenie',
    title: 'Награждение батыра и закрытие',
    summary: 'Чествование победителей состязаний и торжественное закрытие праздника.',
    start: at('17:30'),
    end: at('18:00'),
    venue: 'Главная сцена',
    category: 'ceremony',
  },
]

const payload = await getPayload({ config })
const log = (...a: unknown[]) => payload.logger.info(a.map(String).join(' '))
const force = process.env.SEED_FORCE === '1'

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

log(`Готово. Демо-программа: создано ${created}, пропущено ${skipped} (всего ${EVENTS.length}). Дата (ориентир): ${DAY}.`)
process.exit(0)
