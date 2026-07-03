'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { t, type Locale } from '../../../lib/i18n'
import { asciiUrl, SITE_NAME } from '../../../lib/site'

// Единая компактная кнопка «Поделиться» (заявка владельца: не захламлять сайт
// рядами кнопок): одна кнопка → раскрывающийся список вариантов — системное
// меню телефона, буфер, Telegram / ВКонтакте / Одноклассники + произвольные
// дополнительные действия (печать/PNG/…). Содержимое списка рендерится только
// после клика (client-only) → живые значения (минуты отсчёта, cache-buster)
// не создают hydration-mismatch.

export type ShareExtra = { label: string; onClick: () => void }

export function ShareMenu({
  locale,
  title,
  text,
  url,
  getText,
  getUrl,
  onSystemShare,
  extra,
  buttonLabel,
}: {
  locale: Locale
  title?: string
  /** Текст подписи (строка — для серверных родителей). */
  text?: string
  /** Адрес для шаринга (строка — для серверных родителей). */
  url?: string
  /** Живой текст (клиентские родители: отсчёт и т.п.) — приоритетнее text. */
  getText?: () => string
  /** Живой URL (cache-buster) — приоритетнее url. */
  getUrl?: () => string
  /** Переопределение «системного» шаринга (напр. отдать PNG-файл). */
  onSystemShare?: () => void | Promise<void>
  /** Дополнительные пункты списка (печать / PNG / .txt / …). */
  extra?: ShareExtra[]
  buttonLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  // Позиция списка (fixed, от кнопки). Список рендерится ПОРТАЛОМ в body:
  // секции сайта создают свои stacking-контексты и стили ссылок (фото-секции) —
  // внутри них меню перекрывалось следующими слоями и теряло цвета. Портал
  // выносит список поверх ВСЕХ слоёв с собственными цветами.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const theText = () => (getText ? getText() : text || '')
  const theUrl = () => (getUrl ? getUrl() : url || (typeof window !== 'undefined' ? window.location.href : ''))

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    const r = rootRef.current?.getBoundingClientRect()
    if (r) {
      // не выпускаем список за правый край экрана
      const left = Math.min(r.left, Math.max(8, window.innerWidth - 244))
      setPos({ top: r.bottom + 6, left })
    }
    setOpen(true)
  }

  // Закрытие по клику вне списка, Esc, прокрутке и ресайзу (позиция fixed).
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const tgt = e.target as Node
      if (!rootRef.current?.contains(tgt) && !popRef.current?.contains(tgt)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScroll = () => setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const doCopy = async () => {
    const full = [theText(), theUrl()].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(full)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = full
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setOpen(false)
    }, 1200)
  }

  const doSystem = async () => {
    setOpen(false)
    if (onSystemShare) {
      await onSystemShare()
      return
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: title || SITE_NAME, text: theText(), url: theUrl() })
        return
      }
    } catch {
      return // отмена пользователем — не ошибка
    }
    void doCopy()
  }

  const enc = encodeURIComponent
  // В соцсети URL уходит в ASCII-форме (punycode-хост): юникод-домен ВК/ОК
  // рисуют как «?4??4?…» в карточке репоста. Punycode они декодируют сами и
  // показывают домен нормально; ссылка кликабельна.
  const links = open
    ? [
        { label: 'Telegram', href: `https://t.me/share/url?url=${enc(asciiUrl(theUrl()))}&text=${enc(theText())}` },
        {
          label: 'ВКонтакте',
          href: `https://vk.com/share.php?url=${enc(asciiUrl(theUrl()))}&title=${enc(title || SITE_NAME)}&comment=${enc(theText())}`,
        },
        {
          label: 'Одноклассники',
          href: `https://connect.ok.ru/offer?url=${enc(asciiUrl(theUrl()))}&title=${enc(theText())}`,
        },
      ]
    : []

  return (
    <div className={`sharemenu${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="chip myprog-chip sharemenu-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={toggle}
      >
        📤 {buttonLabel || t(locale, 'sharemenu.button')} {open ? '▴' : '▾'}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            className="sharemenu-pop"
            role="menu"
            ref={popRef}
            style={{ top: pos.top, left: pos.left }}
          >
          <button type="button" className="sharemenu-item" role="menuitem" onClick={doSystem}>
            📲 {t(locale, 'sharemenu.system')}
          </button>
          <button type="button" className="sharemenu-item" role="menuitem" onClick={doCopy}>
            {copied ? `✓ ${t(locale, 'sharemenu.copied')}` : `📋 ${t(locale, 'sharemenu.copy')}`}
          </button>
          {links.map((l) => (
            <a
              key={l.label}
              className="sharemenu-item"
              role="menuitem"
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          {extra?.map((x, i) => (
            <button
              key={i}
              type="button"
              className="sharemenu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                x.onClick()
              }}
            >
              {x.label}
            </button>
          ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
