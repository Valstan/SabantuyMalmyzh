'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { useAdminMode } from './edit/AdminMode'
import { LentaLightbox } from './LentaLightbox'
import type { LentaMedia } from './lentaTypes'
import { ShareMenu } from './ShareMenu'

// Клиентская сетка «Фотостены»: миниатюры + подпись-атрибуция (автор со ссылкой
// на исходный VK-пост) под каждым кадром; клик по фото — единый лайтбокс сайта.
//
// В режиме редактирования сайта (персонал, «Управление») — множественный выбор
// кадров галочками: плавающая панель действий (Поделиться / Копировать в буфер /
// Удалить). Удаление на выбор: «Убрать со страницы» (status→rejected — кадр
// остаётся в базе, вернём в /admin) или «Удалить из базы полностью» (DELETE).
export type FotostenaItem = {
  // id есть только у кадров из коллекции vk-candidates (страница /fotostena) —
  // для них доступно управление. Статичные фотоотчёты событий (EventView) id
  // не имеют → множественный выбор/удаление там не показываются.
  id?: number
  thumbUrl: string
  fullUrl: string
  alt: string | null
  authorName: string | null
  postUrl: string
}

const abs = (u: string) => (u.startsWith('http') ? u : `${window.location.origin}${u}`)

export function FotostenaGallery({
  items,
  locale,
  manageable = false,
}: {
  items: FotostenaItem[]
  locale: Locale
  /** Разрешить массовое управление кадрами (только /fotostena — кадры из БД с id). */
  manageable?: boolean
}) {
  const [index, setIndex] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const { isAdmin, mode } = useAdminMode()
  const canManage = manageable && isAdmin && mode === 'manage'

  const media: LentaMedia[] = items.map((i) => ({
    kind: 'photo',
    mediaUrl: i.fullUrl,
    posterUrl: null,
    width: null,
    height: null,
  }))

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const clear = () => setSelected(new Set())
  const selectAll = () =>
    setSelected(new Set(items.map((it) => it.id).filter((v): v is number => v != null)))

  return (
    <>
      <div className="medialib-grid">
        {items.map((item, i) => (
          <figure key={item.id ?? i} className={`fotostena-cell${canManage ? ' is-manage' : ''}`}>
            <button
              type="button"
              className="medialib-cell"
              onClick={() => setIndex(i)}
              aria-label={item.alt || t(locale, 'mediateka.openPhoto')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumbUrl} alt={item.alt || ''} loading="lazy" />
            </button>
            {canManage && item.id != null && (
              <label className={`fotostena-check${selected.has(item.id) ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id!)}
                  aria-label={t(locale, 'fotostena.sel.pick')}
                />
                <span aria-hidden="true">{selected.has(item.id) ? '✓' : ''}</span>
              </label>
            )}
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

      {canManage && selected.size > 0 && (
        <SelectBar
          items={items}
          selected={selected}
          locale={locale}
          onClear={clear}
          onSelectAll={selectAll}
        />
      )}
    </>
  )
}

// Плавающая панель массовых действий над выбранными кадрами (режим «Управление»).
function SelectBar({
  items,
  selected,
  locale,
  onClear,
  onSelectAll,
}: {
  items: FotostenaItem[]
  selected: Set<number>
  locale: Locale
  onClear: () => void
  onSelectAll: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chosen = items.filter((it): it is FotostenaItem & { id: number } => it.id != null && selected.has(it.id))
  const count = chosen.length
  const allSelected = count === items.length
  const urlsText = () => chosen.map((it) => abs(it.fullUrl)).join('\n')

  const copy = async () => {
    const text = urlsText()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const remove = async (target: 'page' | 'db') => {
    setDelOpen(false)
    const key = target === 'db' ? 'fotostena.sel.confirmDb' : 'fotostena.sel.confirmPage'
    const msg = t(locale, key).replace('{n}', String(count))
    if (typeof window !== 'undefined' && !window.confirm(msg)) return
    setBusy(true)
    setError(null)
    try {
      for (const it of chosen) {
        const res =
          target === 'db'
            ? await fetch(`/api/vk-candidates/${it.id}`, { method: 'DELETE', credentials: 'include' })
            : await fetch(`/api/vk-candidates/${it.id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' }),
              })
        if (!res.ok) throw new Error(String(res.status))
      }
      onClear()
      router.refresh()
    } catch (e) {
      setError(t(locale, 'fotostena.sel.error').replace('{e}', String((e as Error).message || e)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fotostena-selectbar" role="toolbar" aria-label={t(locale, 'fotostena.sel.bar')}>
      <span className="fsb-count">
        {t(locale, 'fotostena.sel.selected')}: <b>{count}</b>
      </span>

      <button type="button" className="fsb-btn fsb-btn--ghost" onClick={onSelectAll} disabled={busy || allSelected}>
        {t(locale, 'fotostena.sel.all')}
      </button>

      <ShareMenu
        locale={locale}
        openUp
        buttonLabel={t(locale, 'fotostena.sel.share')}
        title={t(locale, 'fotostena.title')}
        getText={urlsText}
        getUrl={() => (typeof window !== 'undefined' ? window.location.href : '')}
      />

      <button type="button" className="fsb-btn" onClick={copy} disabled={busy}>
        {copied ? `✓ ${t(locale, 'fotostena.sel.copied')}` : `📋 ${t(locale, 'fotostena.sel.copy')}`}
      </button>

      <div className="fsb-del">
        <button
          type="button"
          className="fsb-btn fsb-btn--danger"
          onClick={() => setDelOpen((v) => !v)}
          aria-expanded={delOpen}
          aria-haspopup="menu"
          disabled={busy}
        >
          🗑 {busy ? t(locale, 'fotostena.sel.busy') : `${t(locale, 'fotostena.sel.delete')} ▴`}
        </button>
        {delOpen && (
          <div className="fsb-del-menu" role="menu">
            <button type="button" className="fsb-del-item" role="menuitem" onClick={() => remove('page')}>
              {t(locale, 'fotostena.sel.delPage')}
              <small>{t(locale, 'fotostena.sel.delPageHint')}</small>
            </button>
            <button
              type="button"
              className="fsb-del-item fsb-del-item--danger"
              role="menuitem"
              onClick={() => remove('db')}
            >
              {t(locale, 'fotostena.sel.delDb')}
              <small>{t(locale, 'fotostena.sel.delDbHint')}</small>
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        className="fsb-close"
        onClick={onClear}
        disabled={busy}
        aria-label={t(locale, 'fotostena.sel.deselect')}
      >
        ×
      </button>

      {error && <span className="fsb-error">{error}</span>}
    </div>
  )
}
