'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { Locale } from '../../../../lib/i18n'
import { hasUnsupportedNodes, htmlToLexical, lexicalToHtml } from '../../../../lib/lexical-lite'
import { useAdminMode } from './AdminMode'
import { InlineImage } from './InlineImage'
import { LiteRichTextEditor } from './LiteRichTextEditor'
import { Modal } from './Modal'

type RawMedia =
  | number
  | string
  | { id?: number | string; url?: string | null; sizes?: Record<string, { url?: string | null } | undefined> }
  | null
  | undefined
type RawEvent = {
  id: number | string
  title?: string
  summary?: string | null
  location?: string | null
  venue?: string | null
  content?: unknown
  heroImage?: RawMedia
}

function mediaIdOf(v: RawMedia): string | null {
  if (v == null) return null
  if (typeof v === 'object') return v.id == null ? null : String(v.id)
  return String(v)
}
function mediaUrlOf(v: RawMedia): string | null {
  if (v && typeof v === 'object') return v.sizes?.card?.url || v.url || null
  return null
}
const numId = (s: string | null) => (s == null ? null : /^\d+$/.test(s) ? Number(s) : s)

/**
 * On-site редактор события (Events). Заголовок/краткое/место/площадка/обложка +
 * тело (richText с inline-картинками). Locale-aware, PATCH с _status:'published'
 * (Events версионируется). Калька с PageEditor.
 */
export const EventEditor: React.FC<{ id: number | string; title: string; locale: Locale }> = ({
  id,
  title: initialTitle,
  locale,
}) => {
  const { isAdmin, mode } = useAdminMode()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(initialTitle)
  const [summary, setSummary] = useState('')
  const [location, setLocation] = useState('')
  const [venue, setVenue] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [bodyUnsupported, setBodyUnsupported] = useState(false)
  const [heroId, setHeroId] = useState<string | null>(null)
  const [heroUrl, setHeroUrl] = useState<string | null>(null)

  const openEditor = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${id}?depth=1&locale=${locale}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Не удалось загрузить событие (${res.status})`)
      const ev = (await res.json()) as RawEvent
      setTitle(ev.title ?? initialTitle)
      setSummary(ev.summary ?? '')
      setLocation(ev.location ?? '')
      setVenue(ev.venue ?? '')
      const unsupported = hasUnsupportedNodes(ev.content)
      setBodyUnsupported(unsupported)
      setBodyHtml(unsupported ? '' : lexicalToHtml(ev.content))
      setHeroId(mediaIdOf(ev.heroImage))
      setHeroUrl(mediaUrlOf(ev.heroImage))
    } catch (e) {
      setError(String((e as Error).message || e))
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        title: title.trim() || initialTitle,
        summary: summary.trim() ? summary.trim() : null,
        location: location.trim() ? location.trim() : null,
        venue: venue.trim() ? venue.trim() : null,
        heroImage: numId(heroId),
        _status: 'published',
      }
      if (!bodyUnsupported) body.content = htmlToLexical(bodyHtml)

      const res = await fetch(`/api/events/${id}?locale=${locale}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Не удалось сохранить (${res.status}): ${txt.slice(0, 200)}`)
      }
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(String((e as Error).message || e))
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin || mode !== 'manage') return null

  return (
    <div className="edit-actionbar">
      <button type="button" className="edit-edit-btn" onClick={openEditor}>
        ✎ Редактировать событие{locale === 'tt' ? ' (татарча)' : ''}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Редактирование события"
        description="Название, описание, место, обложка и текст."
        wide
        footer={
          <>
            <button type="button" className="edit-btn" onClick={() => setOpen(false)} disabled={saving}>
              Отмена
            </button>
            <button type="button" className="btn btn-gold" onClick={save} disabled={saving || loading}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </>
        }
      >
        {loading ? (
          <p className="edit-muted">Загружаем…</p>
        ) : (
          <div className="edit-form">
            <label className="edit-field">
              <span className="edit-field__label">Название</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="edit-input" />
            </label>
            <label className="edit-field">
              <span className="edit-field__label">Краткое описание</span>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="edit-textarea" rows={2} />
            </label>
            <div className="edit-grid-2">
              <label className="edit-field">
                <span className="edit-field__label">Место проведения</span>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="edit-input" />
              </label>
              <label className="edit-field">
                <span className="edit-field__label">Площадка / сцена</span>
                <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="edit-input" />
              </label>
            </div>

            <div className="edit-field">
              <span className="edit-field__label">Главное изображение</span>
              <InlineImage
                previewUrl={heroUrl}
                alt={title}
                allowRemove
                onChange={(mid, url) => {
                  setHeroId(mid)
                  setHeroUrl(url)
                }}
                onError={setError}
              />
            </div>

            <div className="edit-field">
              <span className="edit-field__label">Подробное описание</span>
              {bodyUnsupported ? (
                <p className="edit-warn">
                  Текст содержит сложное форматирование — правьте в админке, чтобы не потерять.
                </p>
              ) : (
                <LiteRichTextEditor initialHtml={bodyHtml || '<p><br></p>'} onChange={setBodyHtml} onError={setError} />
              )}
            </div>

            {error ? <p className="edit-error">{error}</p> : null}
          </div>
        )}
      </Modal>
    </div>
  )
}
