import type { Metadata } from 'next'

import config from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import { withRetry } from '../../../lib/withRetry'
import { SectionHeading } from '../components/SectionHeading'
import { GalleryEditor } from '../components/edit/GalleryEditor'
import { AlbumGallery, type AlbumPhoto } from '../gallery/[slug]/AlbumGallery'

// Общее тело альбома (ru: /gallery/[slug], tt: /tt/gallery/[slug]). title/description/caption — с locale.
type MediaLike = { url?: string | null; alt?: string | null; sizes?: Record<string, { url?: string | null }> }

// Транзиентный сбой БД → throw (после ретраев): ISR не закэширует ложный 404 на
// реально существующем альбоме, а отдаст прошлый кэш. null = альбома реально нет.
async function queryAlbum(slug: string, locale: Locale) {
  return withRetry(async () => {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'gallery',
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
      limit: 1,
      pagination: false,
      depth: 1,
      locale,
    })
    return res.docs[0] ?? null
  })
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }) : null

export async function AlbumView({ slug, locale }: { slug: string; locale: Locale }) {
  const album = await queryAlbum(decodeURIComponent(slug), locale)
  if (!album) notFound()

  const rawPhotos = Array.isArray(album.photos) ? album.photos : []
  const photos: AlbumPhoto[] = rawPhotos
    .map((p): AlbumPhoto | null => {
      const img = p.image && typeof p.image === 'object' ? (p.image as MediaLike) : null
      const src = img?.sizes?.card?.url || img?.url || null
      if (!src) return null
      const full = img?.sizes?.wide?.url || img?.url || src
      return { src, full, alt: p.caption || img?.alt || album.title, caption: p.caption || null }
    })
    .filter((p): p is AlbumPhoto => p !== null)

  return (
    <main>
      <section className="section">
        <div className="section-inner">
          <p style={{ marginBottom: '1rem' }}>
            <Link className="breadcrumb" href={localeHref(locale, '/gallery')}>
              ← {t(locale, 'nav.gallery')}
            </Link>
          </p>
          <SectionHeading eyebrow={t(locale, 'common.albumFallback')} title={album.title} />
          {album.description && <p className="section-lead">{album.description}</p>}
          {fmtDate(album.date) && <p className="meta">{fmtDate(album.date)}</p>}

          <GalleryEditor id={album.id} title={album.title} locale={locale} />

          {photos.length > 0 ? (
            <AlbumGallery photos={photos} />
          ) : (
            <div className="placeholder">{t(locale, 'gallery.empty')}</div>
          )}
        </div>
      </section>
    </main>
  )
}

export async function albumMeta(slug: string, locale: Locale): Promise<Metadata> {
  const album = await queryAlbum(decodeURIComponent(slug), locale)
  return { title: album ? `${album.title} — ${t(locale, 'nav.gallery')}` : t(locale, 'notFound.title') }
}
