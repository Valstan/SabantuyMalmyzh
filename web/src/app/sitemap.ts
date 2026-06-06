import type { MetadataRoute } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

// /sitemap.xml — события, страницы (Pages), альбомы галереи + статические маршруты.
// Ревалидируется раз в час.
export const revalidate = 3600

const baseUrl = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'daily', priority: 1 },
    // Статические публичные маршруты — НЕ Pages-доки (иначе бы не попали в карту):
    // карта фестиваля и индекс галереи. Культ-разделы (/narody, /maydan…) — это
    // Pages-доки, их добавляет цикл pages ниже.
    { url: `${baseUrl}/map`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/gallery`, changeFrequency: 'weekly', priority: 0.6 },
  ]

  try {
    const payload = await getPayload({ config })
    const [events, pages, albums] = await Promise.all([
      payload.find({
        collection: 'events',
        where: { _status: { equals: 'published' } },
        depth: 0,
        limit: 1000,
        pagination: false,
      }),
      payload.find({
        collection: 'pages',
        where: { _status: { equals: 'published' } },
        depth: 0,
        limit: 1000,
        pagination: false,
      }),
      payload.find({
        collection: 'gallery',
        where: { _status: { equals: 'published' } },
        depth: 0,
        limit: 1000,
        pagination: false,
      }),
    ])

    for (const e of events.docs) {
      if (!e.slug) continue
      entries.push({
        url: `${baseUrl}/events/${encodeURIComponent(e.slug)}`,
        lastModified: e.updatedAt ? new Date(e.updatedAt) : undefined,
        changeFrequency: 'weekly',
      })
    }

    for (const p of pages.docs) {
      if (!p.slug) continue
      entries.push({
        url: `${baseUrl}/${encodeURIComponent(p.slug)}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
        changeFrequency: 'monthly',
      })
    }

    for (const a of albums.docs) {
      if (!a.slug) continue
      entries.push({
        url: `${baseUrl}/gallery/${encodeURIComponent(a.slug)}`,
        lastModified: a.updatedAt ? new Date(a.updatedAt) : undefined,
        changeFrequency: 'monthly',
      })
    }
  } catch {
    // Нет БД (например, сборка без сервера) — отдаём минимальный sitemap.
  }

  return entries
}
