'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { Locale } from '../../../../lib/i18n'
import { useAdminMode } from './AdminMode'
import { Modal } from './Modal'

type Row = { id?: string; key: string; title?: string | null; text?: string | null }
type RawHome = {
  heroEyebrow?: string | null
  heroTitleAccent?: string | null
  heroTagline?: string | null
  featuresEyebrow?: string | null
  featuresTitle?: string | null
  features?: Row[]
  cultureEyebrow?: string | null
  cultureTitle?: string | null
  cultureLead?: string | null
  cultureCards?: Row[]
}

/**
 * On-site редактор текстов главной (глобал home). Правит герой, заголовки секций,
 * лид и ТЕКСТ карточек (features/cultureCards) — строки фиксированы кодом (по key),
 * меняется только title/text. Глобал без drafts → POST сразу публичен. Locale-aware.
 */
export const HomeEditor: React.FC<{ locale: Locale }> = ({ locale }) => {
  const { isAdmin, mode } = useAdminMode()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [d, setD] = useState<RawHome>({})

  const openEditor = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/globals/home?depth=0&locale=${locale}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Не удалось загрузить (${res.status})`)
      const raw = (await res.json()) as RawHome
      setD({
        heroEyebrow: raw.heroEyebrow ?? '',
        heroTitleAccent: raw.heroTitleAccent ?? '',
        heroTagline: raw.heroTagline ?? '',
        featuresEyebrow: raw.featuresEyebrow ?? '',
        featuresTitle: raw.featuresTitle ?? '',
        features: (raw.features || []).map((r) => ({ id: r.id, key: r.key, title: r.title ?? '', text: r.text ?? '' })),
        cultureEyebrow: raw.cultureEyebrow ?? '',
        cultureTitle: raw.cultureTitle ?? '',
        cultureLead: raw.cultureLead ?? '',
        cultureCards: (raw.cultureCards || []).map((r) => ({ id: r.id, key: r.key, title: r.title ?? '', text: r.text ?? '' })),
      })
    } catch (e) {
      setError(String((e as Error).message || e))
    } finally {
      setLoading(false)
    }
  }

  const setField = (k: keyof RawHome, v: string) => setD((p) => ({ ...p, [k]: v }))
  const setRow = (arr: 'features' | 'cultureCards', key: string, patch: Partial<Row>) =>
    setD((p) => ({ ...p, [arr]: (p[arr] || []).map((r) => (r.key === key ? { ...r, ...patch } : r)) }))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/globals/home?locale=${locale}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
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
        ✎ Тексты главной{locale === 'tt' ? ' (татарча)' : ''}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Тексты главной страницы"
        description="Герой, заголовки секций и текст карточек. Картинки/иконки — в коде."
        wide
        footer={
          <>
            <button type="button" className="edit-btn" onClick={() => setOpen(false)} disabled={saving}>Отмена</button>
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
            <p className="edit-field__label">Герой</p>
            <label className="edit-field">
              <span className="edit-field__label">Надзаголовок</span>
              <input type="text" value={d.heroEyebrow ?? ''} onChange={(e) => setField('heroEyebrow', e.target.value)} className="edit-input" />
            </label>
            <label className="edit-field">
              <span className="edit-field__label">Акцент в заголовке (напр. «Малмыж»)</span>
              <input type="text" value={d.heroTitleAccent ?? ''} onChange={(e) => setField('heroTitleAccent', e.target.value)} className="edit-input" />
            </label>
            <label className="edit-field">
              <span className="edit-field__label">Подзаголовок</span>
              <textarea value={d.heroTagline ?? ''} onChange={(e) => setField('heroTagline', e.target.value)} className="edit-textarea" rows={2} />
            </label>

            <p className="edit-field__label" style={{ borderTop: '1px solid #e6ddcf', paddingTop: '0.8rem' }}>Секция «Что вас ждёт»</p>
            <div className="edit-grid-2">
              <label className="edit-field">
                <span className="edit-field__label">Надзаголовок</span>
                <input type="text" value={d.featuresEyebrow ?? ''} onChange={(e) => setField('featuresEyebrow', e.target.value)} className="edit-input" />
              </label>
              <label className="edit-field">
                <span className="edit-field__label">Заголовок</span>
                <input type="text" value={d.featuresTitle ?? ''} onChange={(e) => setField('featuresTitle', e.target.value)} className="edit-input" />
              </label>
            </div>
            {(d.features || []).map((r) => (
              <div key={r.key} className="edit-point-row">
                <input type="text" value={r.title ?? ''} placeholder="Заголовок карточки" onChange={(e) => setRow('features', r.key, { title: e.target.value })} className="edit-input" />
                <input type="text" value={r.text ?? ''} placeholder="Описание" onChange={(e) => setRow('features', r.key, { text: e.target.value })} className="edit-input" />
              </div>
            ))}

            <p className="edit-field__label" style={{ borderTop: '1px solid #e6ddcf', paddingTop: '0.8rem' }}>Секция «Традиции и культура»</p>
            <div className="edit-grid-2">
              <label className="edit-field">
                <span className="edit-field__label">Надзаголовок</span>
                <input type="text" value={d.cultureEyebrow ?? ''} onChange={(e) => setField('cultureEyebrow', e.target.value)} className="edit-input" />
              </label>
              <label className="edit-field">
                <span className="edit-field__label">Заголовок</span>
                <input type="text" value={d.cultureTitle ?? ''} onChange={(e) => setField('cultureTitle', e.target.value)} className="edit-input" />
              </label>
            </div>
            <label className="edit-field">
              <span className="edit-field__label">Лид</span>
              <textarea value={d.cultureLead ?? ''} onChange={(e) => setField('cultureLead', e.target.value)} className="edit-textarea" rows={2} />
            </label>
            {(d.cultureCards || []).map((r) => (
              <div key={r.key} className="edit-point-row">
                <input type="text" value={r.title ?? ''} placeholder="Заголовок карточки" onChange={(e) => setRow('cultureCards', r.key, { title: e.target.value })} className="edit-input" />
                <input type="text" value={r.text ?? ''} placeholder="Описание" onChange={(e) => setRow('cultureCards', r.key, { text: e.target.value })} className="edit-input" />
              </div>
            ))}

            {error ? <p className="edit-error">{error}</p> : null}
          </div>
        )}
      </Modal>
    </div>
  )
}
