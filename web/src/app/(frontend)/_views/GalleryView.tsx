import type { Metadata } from 'next'

import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import { SectionHeading } from '../components/SectionHeading'

// Общее тело галереи-индекса (ru: /gallery, tt: /tt/gallery). title/description — с locale.
type MediaLike = { url?: string | null; alt?: string | null; sizes?: Record<string, { url?: string | null }> }

function thumb(m: unknown): MediaLike | null {
  return m && typeof m === 'object' ? (m as MediaLike) : null
}

async function getAlbums(locale: Locale) {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'gallery',
      where: { _status: { equals: 'published' } },
      sort: '-date',
      depth: 1,
      limit: 100,
      locale,
    })
    return res.docs
  } catch {
    return null
  }
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' }) : null

export async function GalleryView({ locale }: { locale: Locale }) {
  const albums = await getAlbums(locale)

  return (
    <main>
      <section className="section section--tint">
        <div className="section-inner">
          <SectionHeading eyebrow={t(locale, 'home.gallery.eyebrow')} title={t(locale, 'nav.gallery')} />
          <p className="section-lead">{t(locale, 'home.gallery.title')}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          {albums && albums.length > 0 ? (
            <div className="gallery-grid">
              {albums.map((a) => {
                const cover = thumb(a.coverImage)
                const src = cover?.sizes?.card?.url || cover?.url || null
                const count = Array.isArray(a.photos) ? a.photos.length : 0
                return (
                  <Link className="gallery-card" href={localeHref(locale, `/gallery/${a.slug}`)} key={a.id}>
                    <div className="gallery-card-img">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={cover?.alt || a.title} loading="lazy" />
                      ) : (
                        <div className="gallery-card-fallback" aria-hidden="true">
                          🎪
                        </div>
                      )}
                    </div>
                    <div className="gallery-card-body">
                      <h2>{a.title}</h2>
                      <p className="meta">
                        {fmtDate(a.date)}
                        {count > 0 && ` · ${count}`}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="placeholder">{t(locale, 'gallery.empty')}</div>
          )}
        </div>
      </section>
    </main>
  )
}

export const galleryMeta = (locale: Locale): Metadata => ({
  title: `${t(locale, 'nav.gallery')} — Сабантуй Малмыж`,
})
