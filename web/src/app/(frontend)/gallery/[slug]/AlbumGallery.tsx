'use client'

import { useState } from 'react'

import type { Locale } from '../../../../lib/i18n'
import { localeHref } from '../../../../lib/localeHref'
import { LentaLightbox } from '../../components/LentaLightbox'
import type { LentaMedia } from '../../components/lentaTypes'

/**
 * Клиентская галерея альбома: masonry-«фотостена» (CSS-колонки, фото в натуральных
 * пропорциях) + ЕДИНЫЙ лайтбокс сайта (как в «Народной ленте»: ←/→, свайп, Esc,
 * на весь экран, поделиться, переход в медиатеку). Серверная страница отдаёт
 * чистые props (без Payload-типов).
 */
export type AlbumPhoto = { src: string; full: string; alt: string; caption?: string | null }

export function AlbumGallery({ photos, locale = 'ru' }: { photos: AlbumPhoto[]; locale?: Locale }) {
  const [open, setOpen] = useState<number | null>(null)

  const media: LentaMedia[] = photos.map((p) => ({
    kind: 'photo',
    mediaUrl: p.full,
    posterUrl: null,
    width: null,
    height: null,
  }))

  return (
    <>
      <div className="photo-masonry">
        {photos.map((p, i) => (
          <button
            type="button"
            className="photo-masonry-item"
            key={i}
            onClick={() => setOpen(i)}
            aria-label={p.caption ? `Открыть фото: ${p.caption}` : 'Открыть фото'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={p.alt} loading="lazy" />
            {p.caption && <span className="photo-cap">{p.caption}</span>}
          </button>
        ))}
      </div>

      {open !== null && media[open] && (
        <LentaLightbox
          media={media}
          index={open}
          caption={photos[open].caption || photos[open].alt || null}
          authorName={null}
          locale={locale}
          onClose={() => setOpen(null)}
          onNavigate={setOpen}
          libraryHref={localeHref(locale, '/mediateka')}
        />
      )}
    </>
  )
}
