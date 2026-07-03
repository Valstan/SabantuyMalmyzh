'use client'

import { useEffect, useRef, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { SITE_NAME } from '../../../lib/site'

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

  const theText = () => (getText ? getText() : text || '')
  const theUrl = () => (getUrl ? getUrl() : url || (typeof window !== 'undefined' ? window.location.href : ''))

  // Закрытие по клику вне списка и по Esc.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
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
  const links = open
    ? [
        { label: 'Telegram', href: `https://t.me/share/url?url=${enc(theUrl())}&text=${enc(theText())}` },
        {
          label: 'ВКонтакте',
          href: `https://vk.com/share.php?url=${enc(theUrl())}&title=${enc(title || SITE_NAME)}&comment=${enc(theText())}`,
        },
        { label: 'Одноклассники', href: `https://connect.ok.ru/offer?url=${enc(theUrl())}&title=${enc(theText())}` },
      ]
    : []

  return (
    <div className={`sharemenu${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="chip myprog-chip sharemenu-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        📤 {buttonLabel || t(locale, 'sharemenu.button')} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="sharemenu-pop" role="menu">
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
        </div>
      )}
    </div>
  )
}
