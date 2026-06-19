'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { Locale } from '../../../../lib/i18n'
import { useAdminMode } from './AdminMode'
import { Modal } from './Modal'

// On-site редактор подвала: строка копирайта. Глобал footer без drafts → POST
// публичен. Ссылки подвала переиспользуют подписи меню (header) + разделы культуры.
export const FooterEditor: React.FC<{ locale: Locale }> = ({ locale }) => {
  const { isAdmin, mode } = useAdminMode()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyright, setCopyright] = useState('')

  const openEditor = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/globals/footer?depth=0&locale=${locale}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Не удалось загрузить (${res.status})`)
      const raw = (await res.json()) as { copyright?: string | null }
      setCopyright(raw.copyright ?? '')
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
      const res = await fetch(`/api/globals/footer?locale=${locale}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copyright }),
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
      <button type="button" className="edit-login-btn" onClick={openEditor} title="Редактировать подвал" style={{ margin: '0.5rem auto', display: 'block' }}>
        ✎ Подвал
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Подвал сайта"
        description="Строка копирайта."
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
              <span className="edit-field__label">Копирайт</span>
              <input type="text" value={copyright} onChange={(e) => setCopyright(e.target.value)} className="edit-input" />
            </label>
            {error ? <p className="edit-error">{error}</p> : null}
          </div>
        )}
      </Modal>
    </>
  )
}
