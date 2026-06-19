'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { Locale } from '../../../../lib/i18n'
import { useAdminMode } from './AdminMode'
import { Modal } from './Modal'

type NavRow = { id?: string; key: string; label?: string | null }
type RawHeader = { brand?: string | null; nav?: NavRow[] }

// On-site редактор шапки: название сайта + подписи пунктов меню (по ключу; адрес/
// порядок — в коде). Глобал header без drafts → POST публичен. Locale-aware.
export const HeaderEditor: React.FC<{ locale: Locale }> = ({ locale }) => {
  const { isAdmin, mode } = useAdminMode()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brand, setBrand] = useState('')
  const [nav, setNav] = useState<NavRow[]>([])

  const openEditor = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/globals/header?depth=0&locale=${locale}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Не удалось загрузить (${res.status})`)
      const raw = (await res.json()) as RawHeader
      setBrand(raw.brand ?? '')
      setNav((raw.nav || []).map((n) => ({ id: n.id, key: n.key, label: n.label ?? '' })))
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
      const res = await fetch(`/api/globals/header?locale=${locale}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, nav }),
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
    <>
      <button type="button" className="edit-login-btn" onClick={openEditor} title="Редактировать шапку">
        ✎ Шапка
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Шапка сайта"
        description="Название сайта и подписи пунктов меню."
        footer={
          <>
            <button type="button" className="edit-btn" onClick={() => setOpen(false)} disabled={saving}>Отмена</button>
            <button type="button" className="btn btn-gold" onClick={save} disabled={saving || loading}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
          </>
        }
      >
        {loading ? (
          <p className="edit-muted">Загружаем…</p>
        ) : (
          <div className="edit-form">
            <label className="edit-field">
              <span className="edit-field__label">Название сайта</span>
              <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className="edit-input" />
            </label>
            <span className="edit-field__label">Пункты меню</span>
            {nav.map((n) => (
              <label key={n.key} className="edit-field">
                <span className="edit-field__label" style={{ fontWeight: 400, color: '#8a7d70' }}>{n.key}</span>
                <input
                  type="text"
                  value={n.label ?? ''}
                  onChange={(e) => setNav((prev) => prev.map((r) => (r.key === n.key ? { ...r, label: e.target.value } : r)))}
                  className="edit-input"
                />
              </label>
            ))}
            {error ? <p className="edit-error">{error}</p> : null}
          </div>
        )}
      </Modal>
    </>
  )
}
