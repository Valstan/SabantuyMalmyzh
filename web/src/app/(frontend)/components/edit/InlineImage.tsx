'use client'

import React, { useRef, useState } from 'react'

import { uploadMedia } from '../../../../lib/me'

// Превью картинки + кнопки «Загрузить/Заменить» и (опц.) «Убрать». Загрузка нового
// файла идёт в Media через POST /api/media; наверх отдаём id media-записи и URL
// превью (канонический /api/media/file/{id}). Используется для обложек (hero/cover/
// план карты) и элементов галереи.
export const InlineImage: React.FC<{
  previewUrl: string | null
  alt?: string
  allowRemove?: boolean
  onChange: (mediaId: string | null, previewUrl: string | null) => void
  onError?: (msg: string) => void
}> = ({ previewUrl, alt, allowRemove, onChange, onError }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const pick = () => inputRef.current?.click()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // позволить выбрать тот же файл повторно
    if (!file) return
    setBusy(true)
    const res = await uploadMedia(file, alt)
    setBusy(false)
    if (!res) {
      onError?.('Не удалось загрузить изображение.')
      return
    }
    onChange(res.id, res.url)
  }

  return (
    <div className="edit-image">
      <div className="edit-image__preview">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={alt || ''} />
        ) : (
          <span className="edit-image__empty">нет изображения</span>
        )}
      </div>
      <div className="edit-image__actions">
        <button type="button" className="edit-btn edit-btn--sm" onClick={pick} disabled={busy}>
          {busy ? 'Загрузка…' : previewUrl ? 'Заменить' : 'Загрузить'}
        </button>
        {allowRemove && previewUrl ? (
          <button type="button" className="edit-link-danger" onClick={() => onChange(null, null)} disabled={busy}>
            убрать
          </button>
        ) : null}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
    </div>
  )
}
