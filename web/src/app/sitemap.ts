import type { MetadataRoute } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

import { localeHref } from '../lib/localeHref'
import { getQuizGames } from '../lib/quizGames'

// /sitemap.xml — события, страницы (Pages), альбомы галереи + статические маршруты.
//
// force-dynamic — строим в рантайме против реальной прод-БД, НЕ пререндерим в сборке.
// Иначе Next пререндерит sitemap в CI против ПУСТОЙ build-БД (sabantuy_build) →
// в бандл запекается вырожденный sitemap (только статические маршруты), и при
// ISR он считается свежим (раньше revalidate=3600 → целый час после каждого
// деплоя). Запросы лёгкие (depth:0), краулеры ходят редко → рантайм-генерация дёшева.
export const dynamic = 'force-dynamic'

const baseUrl = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

type Coll = 'events' | 'pages' | 'gallery'
type Entry = MetadataRoute.Sitemap[number]
type Doc = { slug?: string | null; updatedAt?: string | null }

// Запись sitemap с hreflang-альтернатой на татарскую версию (путевая схема /tt, I11).
// path — путь БЕЗ локали-префикса ('/', '/map', '/events/x'); ru — на baseUrl+path,
// tt — на baseUrl + localeHref('tt', path).
function entryFor(path: string, opts: Omit<Entry, 'url' | 'alternates'>): Entry {
  return {
    url: `${baseUrl}${path === '/' ? '/' : path}`,
    alternates: { languages: { ru: `${baseUrl}${path === '/' ? '/' : path}`, tt: `${baseUrl}${localeHref('tt', path)}` } },
    ...opts,
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Статические публичные маршруты — НЕ Pages-доки (карта фестиваля, индекс
  // галереи). Культ-разделы (/narody, /maydan…) — это Pages-доки, их добавляет
  // запрос коллекции pages ниже. У каждого URL — tt-альтернат (hreflang).
  const entries: MetadataRoute.Sitemap = [
    entryFor('/', { changeFrequency: 'daily', priority: 1 }),
    entryFor('/map', { changeFrequency: 'monthly', priority: 0.5 }),
    entryFor('/gallery', { changeFrequency: 'weekly', priority: 0.6 }),
    entryFor('/igra', { changeFrequency: 'monthly', priority: 0.5 }),
    // Страницы конкретных игр (/igra/<slug>) — набор из конфига lib/quizGames.
    ...getQuizGames().map((g) =>
      entryFor(`/igra/${g.slug}`, { changeFrequency: 'monthly', priority: 0.4 }),
    ),
  ]

  // getPayload в metadata-route на prod-standalone может падать (трейсинг
  // зависимостей) — НЕ глушим молча, логируем и отдаём статический минимум.
  let payload: Awaited<ReturnType<typeof getPayload>>
  try {
    payload = await getPayload({ config })
  } catch (e) {
    console.error('[sitemap] getPayload failed:', e)
    return entries
  }

  // Каждую коллекцию — в свой try/catch: сбой одной (или отсутствие БД при
  // сборке) не обнуляет остальные и не блокирует статические маршруты.
  // Раньше общий Promise.all+catch ронял весь sitemap, если падал один запрос.
  const collect = async (collection: Coll, toEntry: (doc: Doc) => Entry | null) => {
    try {
      const res = await payload.find({
        collection,
        where: { _status: { equals: 'published' } },
        depth: 0,
        limit: 1000,
        pagination: false,
      })
      for (const doc of res.docs as Doc[]) {
        const entry = toEntry(doc)
        if (entry) entries.push(entry)
      }
    } catch (e) {
      console.error(`[sitemap] ${collection} query failed:`, e)
    }
  }

  await collect('events', (e) =>
    e.slug
      ? entryFor(`/events/${encodeURIComponent(e.slug)}`, {
          lastModified: e.updatedAt ? new Date(e.updatedAt) : undefined,
          changeFrequency: 'weekly',
        })
      : null,
  )
  await collect('pages', (p) =>
    p.slug
      ? entryFor(`/${encodeURIComponent(p.slug)}`, {
          lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
          changeFrequency: 'monthly',
        })
      : null,
  )
  await collect('gallery', (a) =>
    a.slug
      ? entryFor(`/gallery/${encodeURIComponent(a.slug)}`, {
          lastModified: a.updatedAt ? new Date(a.updatedAt) : undefined,
          changeFrequency: 'monthly',
        })
      : null,
  )

  return entries
}
