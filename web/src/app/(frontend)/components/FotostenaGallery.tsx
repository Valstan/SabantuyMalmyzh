'use client'

import { useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { LentaLightbox } from './LentaLightbox'
import type { LentaMedia } from './lentaTypes'

// Клиентская сетка «Фотостены»: миниатюры + подпись-атрибуция (автор со ссылкой
// на исходный VK-пост) под каждым кадром; клик по фото — единый лайтбокс сайта.
export type FotostenaItem = {
  thumbUrl: string
  fullUrl: string
  alt: string | null
  authorName: string | null
  postUrl: string
}

export function FotostenaGallery({ items, locale }: { items: FotostenaItem[]; locale: Locale }) {
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
          <figure key={i} className="fotostena-cell">
            <button
              type="button"
              className="medialib-cell"
              onClick={() => setIndex(i)}
              aria-label={item.alt || t(locale, 'mediateka.openPhoto')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumbUrl} alt={item.alt || ''} loading="lazy" />
            </button>
            <figcaption className="fotostena-credit">
              {t(locale, 'fotostena.photoBy')}{' '}
              <a href={item.postUrl} target="_blank" rel="noopener noreferrer nofollow">
                {item.authorName || t(locale, 'fotostena.source')}
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
      {index !== null && media[index] && (
        <LentaLightbox
          media={media}
          index={index}
          caption={items[index].alt}
          authorName={items[index].authorName}
          locale={locale}
          onClose={() => setIndex(null)}
          onNavigate={setIndex}
        />
      )}
    </>
  )
}
