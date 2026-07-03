'use client'

import { useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { LentaLightbox } from './LentaLightbox'
import type { LentaMedia } from './lentaTypes'

// Клиентская сетка медиатеки: миниатюры + единый лайтбокс сайта (пролистывание,
// на весь экран, поделиться). Данные приходят с сервера (MediatekaView).
export type LibraryItem = {
  thumbUrl: string
  fullUrl: string
  alt: string | null
}

export function MediaLibrary({ items, locale }: { items: LibraryItem[]; locale: Locale }) {
  const [index, setIndex] = useState<number | null>(null)

  const media: LentaMedia[] = items.map((i) => ({
    kind: 'photo',
    mediaUrl: i.fullUrl,
    posterUrl: null,
    width: null,
    height: null,
  }))

  return (
    <>
      <div className="medialib-grid">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            className="medialib-cell"
            onClick={() => setIndex(i)}
            aria-label={item.alt || t(locale, 'mediateka.openPhoto')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.thumbUrl} alt={item.alt || ''} loading="lazy" />
          </button>
        ))}
      </div>
      {index !== null && media[index] && (
        <LentaLightbox
          media={media}
          index={index}
          caption={items[index].alt}
          authorName={null}
          locale={locale}
          onClose={() => setIndex(null)}
          onNavigate={setIndex}
        />
      )}
    </>
  )
}
