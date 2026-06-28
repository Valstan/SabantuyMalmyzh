'use client'

import React, { useEffect, useRef } from 'react'

// Лёгкий доступный диалог (замена shadcn Dialog, которого у нас нет). Закрытие по
// Esc и клику по подложке; focus-trap + возврат фокуса (приём из лайтбокса a11y).
// Рендер контролов редактирования — поверх сайта, на нашем festive.css.
export const Modal: React.FC<{
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Шире для редакторов с картинками. */
  wide?: boolean
}> = ({ open, onClose, title, description, children, footer, wide }) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const lastFocused = useRef<HTMLElement | null>(null)
  // onClose через ref — чтобы keydown-обработчик и эффект НЕ пересоздавались на каждый
  // рендер из-за нестабильного пропа. Иначе эффект перезапускался на каждое нажатие
  // клавиши в полях формы → setTimeout уводил фокус на первый элемент панели (баг ввода
  // подписи в ленте: фокус «улетал» после каждого символа).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Эффект зависит ТОЛЬКО от open → выполняется один раз на открытие/закрытие.
  useEffect(() => {
    if (!open) return
    lastFocused.current = document.activeElement as HTMLElement

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
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
    document.addEventListener('keydown', trapFocus)
    // Фокус на первый интерактивный элемент панели (один раз при открытии).
    const id = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('input, textarea, button')?.focus()
    }, 0)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', trapFocus)
      window.clearTimeout(id)
      document.body.style.overflow = prevOverflow
      lastFocused.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="edit-modal-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={panelRef}
        className={`edit-modal${wide ? ' edit-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="edit-modal__head">
          <h2 className="edit-modal__title">{title}</h2>
          {description ? <p className="edit-modal__desc">{description}</p> : null}
          <button type="button" className="edit-modal__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <div className="edit-modal__body">{children}</div>
        {footer ? <div className="edit-modal__foot">{footer}</div> : null}
      </div>
    </div>
  )
}
