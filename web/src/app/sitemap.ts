import type { MetadataRoute } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

// /sitemap.xml — опубликованные события и страницы. Ревалидируется раз в час.
export const revalidate = 3600

const baseUrl = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'daily', priority: 1 },
  ]

  try {
    const payload = await getPayload({ config })
    const [events, pages] = await Promise.all([
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
  } catch {
    // Нет БД (например, сборка без сервера) — отдаём минимальный sitemap.
  }

  return entries
}
