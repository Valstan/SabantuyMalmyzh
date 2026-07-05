'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { useAdminMode } from './edit/AdminMode'
import { LentaLightbox } from './LentaLightbox'
import type { LentaMedia } from './lentaTypes'
import { ShareMenu } from './ShareMenu'

// Клиентская сетка «Фотостены»: миниатюры + подпись-атрибуция (автор со ссылкой
// на исходный VK-пост) под каждым кадром; клик по фото — единый лайтбокс сайта.
//
// Показываем ВСЕ одобренные кадры, но рендерим ячейки ПОРЦИОННО по мере скролла
// (IntersectionObserver), а сами изображения грузятся лениво — чтобы не «гасить»
// интернет посетителя и не создавать тысячи DOM-узлов сразу. В лайтбоксе соседние
// кадры подгружаются заранее (см. LentaLightbox) → листание свайпом идёт плавно.
//
// В режиме редактирования сайта (персонал, «Управление») — множественный выбор
// кадров галочками: плавающая панель действий (Поделиться / Копировать в буфер /
// Удалить). Удаление на выбор: «Убрать со страницы» (status→rejected — кадр
// остаётся в базе, вернём в /admin) или «Удалить из базы полностью» (DELETE).
// Те же действия для одного кадра доступны прямо в полноэкранном лайтбоксе.
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

const FIRST_BATCH = 30 // сколько ячеек рендерим сразу
const STEP = 24 // сколько добавляем за одну порцию при скролле

const abs = (u: string) => (u.startsWith('http') ? u : `${window.location.origin}${u}`)

export function FotostenaGallery({
  items: initialItems,
  locale,
  manageable = false,
}: {
  items: FotostenaItem[]
  locale: Locale
  /** Разрешить массовое управление кадрами (только /fotostena — кадры из БД с id). */
  manageable?: boolean
}) {
  const [items, setItems] = useState<FotostenaItem[]>(initialItems)
  const [index, setIndex] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [visibleCount, setVisibleCount] = useState(() => Math.min(FIRST_BATCH, initialItems.length))
  const { isAdmin, mode } = useAdminMode()
  const canManage = manageable && isAdmin && mode === 'manage'

  // Если серверные items поменялись (ISR-ревалидация после модерации) — синхронизуем.
  useEffect(() => {
    setItems(initialItems)
    setVisibleCount((v) => Math.min(Math.max(v, FIRST_BATCH), initialItems.length))
  }, [initialItems])

  const media: LentaMedia[] = items.map((i) => ({
    kind: 'photo',
    mediaUrl: i.fullUrl,
    posterUrl: null,
    width: null,
    height: null,
  }))

  // Порционный догруз ячеек: наблюдаем за «часовым» под сеткой (rootMargin даёт
  // фору — грузим ДО того, как посетитель доскроллит до конца).
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const hasMore = visibleCount < items.length
  const bumpVisible = useCallback(
    () => setVisibleCount((v) => Math.min(v + STEP, items.length)),
    [items.length],
  )
  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) bumpVisible()
      },
      { rootMargin: '800px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, bumpVisible])

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

  // Убрать удалённые id из клиентского списка (без перезагрузки — сохраняем скролл).
  const dropIds = (ids: number[]) => {
    const gone = new Set(ids)
    setItems((prev) => prev.filter((it) => it.id == null || !gone.has(it.id)))
    setSelected(new Set())
  }

  // Навигация в лайтбоксе: подмонтируем миниатюры вперёд, чтобы при закрытии кадр
  // был на месте (предзагрузка самих изображений — внутри LentaLightbox).
  const onLightboxNavigate = (i: number) => {
    setIndex(i)
    if (i >= visibleCount - 3) setVisibleCount((v) => Math.min(Math.max(v, i + STEP), items.length))
  }

  // Удаление одного кадра из лайтбокса (админ). Локально убираем и сдвигаем индекс.
  const removeOneAt = async (i: number, target: 'page' | 'db'): Promise<boolean> => {
    const it = items[i]
    if (!it || it.id == null) return false
    const ok = await mutateCandidate(it.id, target)
    if (!ok) return false
    const nextLen = items.length - 1
    setItems((prev) => prev.filter((x) => x.id !== it.id))
    setIndex((cur) => (cur == null ? cur : nextLen <= 0 ? null : Math.min(cur, nextLen - 1)))
    return true
  }

  const visible = items.slice(0, visibleCount)

  return (
    <>
      <div className="medialib-grid">
        {visible.map((item, i) => (
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

      {hasMore && (
        <div ref={sentinelRef} className="fotostena-sentinel" aria-hidden="true">
          <span className="fotostena-spinner" />
        </div>
      )}

      {index !== null && media[index] && (
        <LentaLightbox
          media={media}
          index={index}
          caption={items[index].alt}
          authorName={items[index].authorName}
          locale={locale}
          onClose={() => setIndex(null)}
          onNavigate={onLightboxNavigate}
          extraActions={(i) => (
            <FotostenaLbActions
              key={items[i]?.id ?? i}
              item={items[i]}
              locale={locale}
              canManage={canManage}
              onDelete={(target) => removeOneAt(i, target)}
            />
          )}
        />
      )}

      {canManage && selected.size > 0 && (
        <SelectBar
          items={items}
          selected={selected}
          locale={locale}
          onClear={clear}
          onSelectAll={selectAll}
          onDeleted={dropIds}
        />
      )}
    </>
  )
}

// PATCH status=rejected (убрать со страницы, остаётся в базе) ИЛИ DELETE (из базы).
async function mutateCandidate(id: number, target: 'page' | 'db'): Promise<boolean> {
  try {
    const res =
      target === 'db'
        ? await fetch(`/api/vk-candidates/${id}`, { method: 'DELETE', credentials: 'include' })
        : await fetch(`/api/vk-candidates/${id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected' }),
          })
    return res.ok
  } catch {
    return false
  }
}

// Кнопки действий над ТЕКУЩИМ кадром в полноэкранном лайтбоксе: копировать URL и
// (для персонала) удалить с выбором «со страницы / из базы». «Поделиться» уже есть
// в самом лайтбоксе (системный share/буфер).
function FotostenaLbActions({
  item,
  locale,
  canManage,
  onDelete,
}: {
  item: FotostenaItem | undefined
  locale: Locale
  canManage: boolean
  onDelete: (target: 'page' | 'db') => Promise<boolean>
}) {
  const [copied, setCopied] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!item) return null

  const copy = async () => {
    const url = abs(item.fullUrl)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const del = async (target: 'page' | 'db') => {
    setDelOpen(false)
    const key = target === 'db' ? 'fotostena.sel.confirmDb' : 'fotostena.sel.confirmPage'
    if (typeof window !== 'undefined' && !window.confirm(t(locale, key).replace('{n}', '1'))) return
    setBusy(true)
    await onDelete(target)
    setBusy(false)
  }

  return (
    <>
      <button
        type="button"
        className={`lightbox-act${copied ? ' is-on' : ''}`}
        onClick={copy}
        aria-label={t(locale, 'fotostena.sel.copy')}
        title={t(locale, 'fotostena.sel.copy')}
      >
        {copied ? '✓' : '📋'}
      </button>

      {canManage && (
        <span className="lightbox-del">
          <button
            type="button"
            className="lightbox-act lightbox-act--danger"
            onClick={() => setDelOpen((v) => !v)}
            aria-expanded={delOpen}
            aria-haspopup="menu"
            disabled={busy}
            aria-label={t(locale, 'fotostena.sel.delete')}
            title={t(locale, 'fotostena.sel.delete')}
          >
            🗑
          </button>
          {delOpen && (
            <span className="fsb-del-menu lightbox-del-menu" role="menu">
              <button type="button" className="fsb-del-item" role="menuitem" onClick={() => del('page')}>
                {t(locale, 'fotostena.sel.delPage')}
                <small>{t(locale, 'fotostena.sel.delPageHint')}</small>
              </button>
              <button
                type="button"
                className="fsb-del-item fsb-del-item--danger"
                role="menuitem"
                onClick={() => del('db')}
              >
                {t(locale, 'fotostena.sel.delDb')}
                <small>{t(locale, 'fotostena.sel.delDbHint')}</small>
              </button>
            </span>
          )}
        </span>
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
  onDeleted,
}: {
  items: FotostenaItem[]
  selected: Set<number>
  locale: Locale
  onClear: () => void
  onSelectAll: () => void
  onDeleted: (ids: number[]) => void
}) {
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
    const done: number[] = []
    for (const it of chosen) {
      const ok = await mutateCandidate(it.id, target)
      if (ok) done.push(it.id)
      else {
        setError(t(locale, 'fotostena.sel.error').replace('{e}', String(it.id)))
        break
      }
    }
    setBusy(false)
    if (done.length) onDeleted(done)
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
