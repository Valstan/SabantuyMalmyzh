'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { Locale } from '../../../../lib/i18n'
import { useAdminMode } from './AdminMode'
import { InlineImage } from './InlineImage'
import { Modal } from './Modal'

type RawMedia =
  | number
  | string
  | { id?: number | string; url?: string | null; sizes?: Record<string, { url?: string | null } | undefined> }
  | null
  | undefined
type RawPoint = { id?: string | null; label?: string | null; type?: string | null; note?: string | null }
type RawMap = { planImage?: RawMedia; intro?: string | null; points?: RawPoint[] }

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

// Те же типы объектов, что в globals/FestivalMap.ts.
const POINT_TYPES: { value: string; label: string }[] = [
  { value: 'stage', label: 'Сцена' },
  { value: 'food', label: 'Еда' },
  { value: 'entrance', label: 'Вход' },
  { value: 'parking', label: 'Парковка' },
  { value: 'wc', label: 'Туалеты' },
  { value: 'medical', label: 'Медпункт' },
  { value: 'other', label: 'Другое' },
]

let uidCounter = 0
const nextUid = () => `pt-${(uidCounter += 1)}`

type PointItem = { uid: string; rowId: string | null; label: string; type: string; note: string }

/**
 * On-site редактор карты фестиваля (глобал festival-map). Описание + план (картинка)
 * + объекты (label/type/note). Глобал без drafts → PATCH сразу публичен (без _status).
 * Locale-aware: intro локализован, planImage/points.type — нет (но label/note едут как есть).
 */
export const MapEditor: React.FC<{ locale: Locale }> = ({ locale }) => {
  const { isAdmin, mode } = useAdminMode()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [intro, setIntro] = useState('')
  const [planId, setPlanId] = useState<string | null>(null)
  const [planUrl, setPlanUrl] = useState<string | null>(null)
  const [points, setPoints] = useState<PointItem[]>([])

  const openEditor = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/globals/festival-map?depth=1&locale=${locale}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Не удалось загрузить карту (${res.status})`)
      const map = (await res.json()) as RawMap
      setIntro(map.intro ?? '')
      setPlanId(mediaIdOf(map.planImage))
      setPlanUrl(mediaUrlOf(map.planImage))
      const list = Array.isArray(map.points) ? map.points : []
      setPoints(
        list.map((p) => ({
          uid: nextUid(),
          rowId: typeof p.id === 'string' ? p.id : null,
          label: typeof p.label === 'string' ? p.label : '',
          type: typeof p.type === 'string' ? p.type : 'other',
          note: typeof p.note === 'string' ? p.note : '',
        })),
      )
    } catch (e) {
      setError(String((e as Error).message || e))
    } finally {
      setLoading(false)
    }
  }

  const updatePoint = (uid: string, patch: Partial<PointItem>) =>
    setPoints((prev) => prev.map((p) => (p.uid === uid ? { ...p, ...patch } : p)))
  const addPoint = () =>
    setPoints((prev) => [...prev, { uid: nextUid(), rowId: null, label: '', type: 'other', note: '' }])
  const removePoint = (uid: string) => setPoints((prev) => prev.filter((p) => p.uid !== uid))

  const save = async () => {
    const empty = points.findIndex((p) => !p.label.trim())
    if (empty !== -1) {
      setError(`У объекта ${empty + 1} пустое название — заполните или удалите строку.`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        intro: intro.trim() ? intro.trim() : null,
        planImage: numId(planId),
        points: points.map((p) => {
          const row: Record<string, unknown> = { label: p.label.trim(), type: p.type, note: p.note.trim() ? p.note.trim() : null }
          if (p.rowId) row.id = p.rowId
          return row
        }),
      }
      const res = await fetch(`/api/globals/festival-map?locale=${locale}`, {
        method: 'POST', // у глобалов Payload REST update = POST
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
        ✎ Редактировать карту{locale === 'tt' ? ' (татарча)' : ''}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Редактирование карты фестиваля"
        description="Описание, план территории и объекты."
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
              <span className="edit-field__label">Короткое описание</span>
              <textarea value={intro} onChange={(e) => setIntro(e.target.value)} className="edit-textarea" rows={2} />
            </label>

            <div className="edit-field">
              <span className="edit-field__label">План территории (картинка)</span>
              <InlineImage
                previewUrl={planUrl}
                alt="План территории"
                allowRemove
                onChange={(mid, url) => {
                  setPlanId(mid)
                  setPlanUrl(url)
                }}
                onError={setError}
              />
            </div>

            <div className="edit-field">
              <span className="edit-field__label">Объекты на территории ({points.length})</span>
              <div className="edit-photos">
                {points.map((p, idx) => (
                  <div key={p.uid} className="edit-point-row">
                    <div className="edit-photo-row__head">
                      <span className="edit-photo-row__num">Объект {idx + 1}</span>
                      <button type="button" className="edit-link-danger" onClick={() => removePoint(p.uid)}>удалить</button>
                    </div>
                    <div className="edit-grid-2">
                      <input
                        type="text"
                        value={p.label}
                        placeholder="Название"
                        onChange={(e) => updatePoint(p.uid, { label: e.target.value })}
                        className="edit-input"
                      />
                      <select value={p.type} onChange={(e) => updatePoint(p.uid, { type: e.target.value })} className="edit-input">
                        {POINT_TYPES.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={p.note}
                      placeholder="Примечание (необязательно)"
                      onChange={(e) => updatePoint(p.uid, { note: e.target.value })}
                      className="edit-input"
                    />
                  </div>
                ))}
              </div>
              <button type="button" className="edit-btn edit-btn--sm" onClick={addPoint}>
                + Добавить объект
              </button>
            </div>

            {error ? <p className="edit-error">{error}</p> : null}
          </div>
        )}
      </Modal>
    </div>
  )
}
