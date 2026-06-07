import Link from 'next/link'
import React from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'

/**
 * Превью галереи на главной: карточки свежих альбомов + лента реальных фото +
 * CTA «Вся галерея». Данные готовит страница (чистые props, href уже локализован).
 */
export type PreviewAlbum = {
  slug: string
  title: string
  meta: string
  coverUrl: string | null
  href: string
}
export type PreviewPhoto = { src: string; full: string; alt: string }

export function GalleryPreview({
  albums,
  photos,
  locale = 'ru',
}: {
  albums: PreviewAlbum[]
  photos: PreviewPhoto[]
  locale?: Locale
}) {
  return (
    <>
      {albums.length > 0 && (
        <div className="gallery-grid">
          {albums.map((a) => (
            <Link className="gallery-card" href={a.href} key={a.slug}>
              <div className="gallery-card-img">
                {a.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.coverUrl} alt={a.title} loading="lazy" />
                ) : (
                  <div className="gallery-card-fallback" aria-hidden="true">
                    🎪
                  </div>
                )}
              </div>
              <div className="gallery-card-body">
                <h2>{a.title}</h2>
                <p className="meta">{a.meta}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <div className="preview-strip">
          {photos.map((p, i) => (
            <a href={p.full} target="_blank" rel="noopener noreferrer" key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} loading="lazy" />
            </a>
          ))}
        </div>
      )}

      <div className="section-cta">
        <Link className="btn btn-gold" href={localeHref(locale, '/gallery')}>
          {t(locale, 'nav.gallery')} →
        </Link>
      </div>
    </>
  )
}
