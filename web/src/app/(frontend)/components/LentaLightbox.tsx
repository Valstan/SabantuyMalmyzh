'use client'

import { useCallback, useEffect, useRef } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import type { LentaItem } from './lentaTypes'

/**
 * Полноэкранный лайтбокс «Народной ленты» (I16). Контролируется из LentaFeed:
 * получает текущий список `items` (в порядке сортировки/фильтра) и активный `index`,
 * сам не хранит состояние перелистывания. Навигация: кнопки ‹/›, клавиши ←/→, Esc,
 * клик по фону — закрыть; на телефоне — свайп влево/вправо (фото). Видео играет прямо
 * в оверлее (нативные controls). Образец — gallery/[slug]/AlbumGallery.tsx + touch + video.
 */
export function LentaLightbox({
  items,
  index,
  locale,
  onClose,
  onNavigate,
}: {
  items: LentaItem[]
  index: number
  locale: Locale
  onClose: () => void
  onNavigate: (i: number) => void
}) {
  const n = items.length
  const current = items[index]

  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  // Точка касания для свайпа + флаг «только что был свайп» (чтобы тап-после-свайпа
  // не закрыл оверлей следующим за touchend кликом-фоном).
  const touchRef = useRef<{ x: number; y: number } | null>(null)
  const swipedRef = useRef(false)

  const go = useCallback((i: number) => onNavigate(((i % n) + n) % n), [n, onNavigate])

  // Клавиатура (Esc / ←/→) + focus-trap по Tab + блокировка прокрутки фона.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(index + 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
      else if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>('button')
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [index, go, onClose])

  // Фокус: при открытии — на «Закрыть»; при закрытии — обратно на элемент-триггер
  // (медиа-кнопка карточки, активная в момент монтирования). Только на открытии/закрытии.
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    closeBtnRef.current?.focus()
    return () => {
      trigger?.focus?.()
    }
  }, [])

  function onTouchStart(e: React.TouchEvent) {
    // На видео свайп не перехватываем — там нативный скраббер (горизонтальный drag).
    if ((e.target as HTMLElement).closest('video')) {
      touchRef.current = null
      return
    }
    const tp = e.touches[0]
    touchRef.current = { x: tp.clientX, y: tp.clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchRef.current
    touchRef.current = null
    if (!start || n < 2) return
    const tp = e.changedTouches[0]
    const dx = tp.clientX - start.x
    const dy = tp.clientY - start.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      // был свайп → подавим закрытие по клику-фону, идущее следом за touchend
      swipedRef.current = true
      go(index + (dx < 0 ? 1 : -1))
    }
  }

  // Тап по фону закрывает; но если только что был свайп — пропускаем один клик.
  function onBackdropClick() {
    if (swipedRef.current) {
      swipedRef.current = false
      return
    }
    onClose()
  }

  if (!current) return null

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={t(locale, 'lenta.title')}
      ref={dialogRef}
      onClick={onBackdropClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        ref={closeBtnRef}
        className="lightbox-btn lightbox-close"
        type="button"
        aria-label={t(locale, 'lenta.lb.close')}
        onClick={onClose}
      >
        ×
      </button>

      {n > 1 && (
        <button
          className="lightbox-btn lightbox-nav prev"
          type="button"
          aria-label={t(locale, 'lenta.lb.prev')}
          onClick={(e) => {
            e.stopPropagation()
            go(index - 1)
          }}
        >
          ‹
        </button>
      )}

      <figure className="lightbox-fig" onClick={(e) => e.stopPropagation()}>
        {current.kind === 'video' ? (
          <video
            key={current.id}
            className="lightbox-video"
            src={current.mediaUrl}
            poster={current.posterUrl ?? undefined}
            controls
            autoPlay
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={current.id} src={current.mediaUrl} alt={current.caption || current.authorName || 'Фото'} />
        )}
        {(current.caption || current.authorName) && (
          <figcaption>
            {current.caption}
            {current.caption && current.authorName ? ' — ' : ''}
            {current.authorName}
          </figcaption>
        )}
      </figure>

      {n > 1 && (
        <button
          className="lightbox-btn lightbox-nav next"
          type="button"
          aria-label={t(locale, 'lenta.lb.next')}
          onClick={(e) => {
            e.stopPropagation()
            go(index + 1)
          }}
        >
          ›
        </button>
      )}

      {n > 1 && (
        <span className="lightbox-count">
          {index + 1} / {n}
        </span>
      )}
    </div>
  )
}
