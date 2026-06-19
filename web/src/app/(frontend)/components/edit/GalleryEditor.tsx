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
type RawPhoto = { id?: string | null; image?: RawMedia; caption?: string | null; [k: string]: unknown }
type RawAlbum = {
  id: number | string
  title?: string
  description?: string | null
  coverImage?: RawMedia
  photos?: RawPhoto[]
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

// Стабильные ключи React для строк (без зависимости от индекса).
let uidCounter = 0
const nextUid = () => `gph-${(uidCounter += 1)}`

type PhotoItem = {
  uid: string
  rowId: string | null // id строки массива (для сохранения на месте); null — новая
  mediaId: string | null
  previewUrl: string | null
  caption: string
}

/**
 * On-site редактор альбома (Gallery). Название/описание/обложка + массив фото:
 * добавить/удалить/заменить + подпись. image у фото required — перед сохранением
 * проверяем, что у каждого выбран файл. Сохраняем строки с их id (update на месте),
 * новые без id (создаются), отсутствующие — удаляются. Locale-aware, _status:'published'.
 */
export const GalleryEditor: React.FC<{ id: number | string; title: string; locale: Locale }> = ({
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
  const [description, setDescription] = useState('')
  const [coverId, setCoverId] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [photos, setPhotos] = useState<PhotoItem[]>([])

  const openEditor = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/gallery/${id}?depth=1&locale=${locale}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Не удалось загрузить альбом (${res.status})`)
      const album = (await res.json()) as RawAlbum
      setTitle(album.title ?? initialTitle)
      setDescription(album.description ?? '')
      setCoverId(mediaIdOf(album.coverImage))
      setCoverUrl(mediaUrlOf(album.coverImage))
      const list = Array.isArray(album.photos) ? album.photos : []
      setPhotos(
        list.map((p) => ({
          uid: nextUid(),
          rowId: typeof p.id === 'string' ? p.id : null,
          mediaId: mediaIdOf(p.image),
          previewUrl: mediaUrlOf(p.image),
          caption: typeof p.caption === 'string' ? p.caption : '',
        })),
      )
    } catch (e) {
      setError(String((e as Error).message || e))
    } finally {
      setLoading(false)
    }
  }

  const updatePhoto = (uid: string, patch: Partial<PhotoItem>) =>
    setPhotos((prev) => prev.map((p) => (p.uid === uid ? { ...p, ...patch } : p)))
  const addPhoto = () =>
    setPhotos((prev) => [...prev, { uid: nextUid(), rowId: null, mediaId: null, previewUrl: null, caption: '' }])
  const removePhoto = (uid: string) => setPhotos((prev) => prev.filter((p) => p.uid !== uid))
  const movePhoto = (uid: string, dir: -1 | 1) =>
    setPhotos((prev) => {
      const i = prev.findIndex((p) => p.uid === uid)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const save = async () => {
    // Валидация: у каждого фото должен быть выбран файл (image required).
    const empty = photos.findIndex((p) => p.mediaId == null)
    if (empty !== -1) {
      setError(`У фото ${empty + 1} не выбран файл — выберите файл или удалите строку.`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        title: title.trim() || initialTitle,
        description: description.trim() ? description.trim() : null,
        coverImage: numId(coverId),
        photos: photos.map((p) => {
          const row: Record<string, unknown> = { image: numId(p.mediaId), caption: p.caption.trim() ? p.caption.trim() : null }
          if (p.rowId) row.id = p.rowId // обновить строку на месте; без id — новая
          return row
        }),
        _status: 'published',
      }
      const res = await fetch(`/api/gallery/${id}?locale=${locale}`, {
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
        ✎ Редактировать альбом{locale === 'tt' ? ' (татарча)' : ''}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Редактирование альбома"
        description="Название, описание, обложка и фотографии."
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
              <span className="edit-field__label">Название альбома</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="edit-input" />
            </label>
            <label className="edit-field">
              <span className="edit-field__label">Описание</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="edit-textarea" rows={2} />
            </label>

            <div className="edit-field">
              <span className="edit-field__label">Обложка</span>
              <InlineImage
                previewUrl={coverUrl}
                alt={title}
                allowRemove
                onChange={(mid, url) => {
                  setCoverId(mid)
                  setCoverUrl(url)
                }}
                onError={setError}
              />
            </div>

            <div className="edit-field">
              <span className="edit-field__label">Фотографии ({photos.length})</span>
              <div className="edit-photos">
                {photos.map((p, idx) => (
                  <div key={p.uid} className="edit-photo-row">
                    <div className="edit-photo-row__head">
                      <span className="edit-photo-row__num">Фото {idx + 1}</span>
                      <span className="edit-photo-row__tools">
                        <button type="button" className="edit-rte-btn" onClick={() => movePhoto(p.uid, -1)} disabled={idx === 0} title="Выше">↑</button>
                        <button type="button" className="edit-rte-btn" onClick={() => movePhoto(p.uid, 1)} disabled={idx === photos.length - 1} title="Ниже">↓</button>
                        <button type="button" className="edit-link-danger" onClick={() => removePhoto(p.uid)}>удалить</button>
                      </span>
                    </div>
                    <InlineImage
                      previewUrl={p.previewUrl}
                      alt={p.caption || title}
                      onChange={(mid, url) => updatePhoto(p.uid, { mediaId: mid, previewUrl: url })}
                      onError={setError}
                    />
                    <input
                      type="text"
                      value={p.caption}
                      placeholder="Подпись (необязательно)"
                      onChange={(e) => updatePhoto(p.uid, { caption: e.target.value })}
                      className="edit-input"
                    />
                  </div>
                ))}
              </div>
              <button type="button" className="edit-btn edit-btn--sm" onClick={addPhoto}>
                + Добавить фото
              </button>
            </div>

            {error ? <p className="edit-error">{error}</p> : null}
          </div>
        )}
      </Modal>
    </div>
  )
}
