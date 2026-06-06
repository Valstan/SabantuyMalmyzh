'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Клиентская галерея альбома: masonry-«фотостена» (CSS-колонки, фото в натуральных
 * пропорциях) + лайтбокс. Клик по фото открывает оверлей с навигацией ←/→, Esc и
 * кликом по фону. Серверная страница отдаёт чистые props (без Payload-типов).
 */
export type AlbumPhoto = { src: string; full: string; alt: string; caption?: string | null }

export function AlbumGallery({ photos }: { photos: AlbumPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const n = photos.length

  const close = useCallback(() => setOpen(null), [])
  const go = useCallback((i: number) => setOpen(((i % n) + n) % n), [n])

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') go(open + 1)
      else if (e.key === 'ArrowLeft') go(open - 1)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, close, go])

  const current = open !== null ? photos[open] : null

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

      {current && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фотографии"
          onClick={close}
        >
          <button className="lightbox-btn lightbox-close" type="button" aria-label="Закрыть" onClick={close}>
            ×
          </button>
          {n > 1 && (
            <button
              className="lightbox-btn lightbox-nav prev"
              type="button"
              aria-label="Предыдущее фото"
              onClick={(e) => {
                e.stopPropagation()
                go(open! - 1)
              }}
            >
              ‹
            </button>
          )}
          <figure className="lightbox-fig" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.full} alt={current.alt} />
            {current.caption && <figcaption>{current.caption}</figcaption>}
          </figure>
          {n > 1 && (
            <button
              className="lightbox-btn lightbox-nav next"
              type="button"
              aria-label="Следующее фото"
              onClick={(e) => {
                e.stopPropagation()
                go(open! + 1)
              }}
            >
              ›
            </button>
          )}
          {n > 1 && (
            <span className="lightbox-count">
              {open! + 1} / {n}
            </span>
          )}
        </div>
      )}
    </>
  )
}
