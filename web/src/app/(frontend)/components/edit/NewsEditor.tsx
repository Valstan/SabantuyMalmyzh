'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { Locale } from '../../../../lib/i18n'
import { hasUnsupportedNodes, htmlToLexical, lexicalToHtml, isEmptyLexical } from '../../../../lib/lexical-lite'
import { videoEmbedSrc } from '../../../../lib/videoEmbed'
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
type RawVideo = { id?: string | null; url?: string | null; title?: string | null }
type RawPost = {
  id: number | string
  title?: string
  excerpt?: string | null
  cover?: RawMedia
  body?: unknown
  videos?: RawVideo[]
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

let uidCounter = 0
const nextUid = () => `nv-${(uidCounter += 1)}`

type VideoItem = { uid: string; rowId: string | null; url: string; title: string }

/**
 * On-site редактор новости. Два режима:
 *   • без id — кнопка «+ Добавить новость» на /novosti (создание, POST /api/news);
 *   • с id  — кнопка «✎ Редактировать новость» на странице поста (PATCH).
 * Поля: заголовок, анонс, обложка (InlineImage → Media), текст с картинками
 * (LiteRichTextEditor, HTML↔lexical), видео по ссылке (VK/Rutube/YouTube — на
 * странице встаёт плеер, файл на сайт не заливается). Locale-aware; сложное
 * lexical-тело (unsupported-узлы) не трогаем — правка через /admin.
 */
export const NewsEditor: React.FC<{ id?: number | string; locale: Locale }> = ({ id, locale }) => {
  const { isAdmin, mode } = useAdminMode()
  const router = useRouter()
  const isCreate = id == null

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [coverId, setCoverId] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [bodyHtml, setBodyHtml] = useState('<p><br></p>')
  const [bodyUnsupported, setBodyUnsupported] = useState(false)
  const [videos, setVideos] = useState<VideoItem[]>([])

  const openEditor = async () => {
    setOpen(true)
    setError(null)
    if (isCreate) {
      setTitle('')
      setExcerpt('')
      setCoverId(null)
      setCoverUrl(null)
      setBodyHtml('<p><br></p>')
      setBodyUnsupported(false)
      setVideos([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/news/${id}?depth=1&locale=${locale}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Не удалось загрузить новость (${res.status})`)
      const post = (await res.json()) as RawPost
      setTitle(post.title ?? '')
      setExcerpt(post.excerpt ?? '')
      setCoverId(mediaIdOf(post.cover))
      setCoverUrl(mediaUrlOf(post.cover))
      const unsupported = hasUnsupportedNodes(post.body)
      setBodyUnsupported(unsupported)
      setBodyHtml(unsupported || isEmptyLexical(post.body) ? '<p><br></p>' : lexicalToHtml(post.body))
      setVideos(
        (Array.isArray(post.videos) ? post.videos : []).map((v) => ({
          uid: nextUid(),
          rowId: typeof v.id === 'string' ? v.id : null,
          url: v.url ?? '',
          title: v.title ?? '',
        })),
      )
    } catch (e) {
      setError(String((e as Error).message || e))
    } finally {
      setLoading(false)
    }
  }

  const updateVideo = (uid: string, patch: Partial<VideoItem>) =>
    setVideos((prev) => prev.map((v) => (v.uid === uid ? { ...v, ...patch } : v)))
  const addVideo = () => setVideos((prev) => [...prev, { uid: nextUid(), rowId: null, url: '', title: '' }])
  const removeVideo = (uid: string) => setVideos((prev) => prev.filter((v) => v.uid !== uid))

  const save = async () => {
    if (!title.trim()) {
      setError('Заполните заголовок новости.')
      return
    }
    const badVideo = videos.find((v) => v.url.trim() && !videoEmbedSrc(v.url))
    if (badVideo) {
      setError(
        `Ссылка «${badVideo.url.slice(0, 60)}» не распознана как VK / Rutube / YouTube — плеер не получится. Проверьте ссылку (или удалите строку).`,
      )
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        excerpt: excerpt.trim() ? excerpt.trim() : null,
        cover: numId(coverId),
        videos: videos
          .filter((v) => v.url.trim())
          .map((v) => {
            const row: Record<string, unknown> = { url: v.url.trim(), title: v.title.trim() ? v.title.trim() : null }
            if (v.rowId) row.id = v.rowId
            return row
          }),
        _status: 'published',
      }
      if (!bodyUnsupported) body.body = htmlToLexical(bodyHtml)
      if (isCreate) body.publishedAt = new Date().toISOString()

      const res = await fetch(isCreate ? `/api/news?locale=${locale}` : `/api/news/${id}?locale=${locale}`, {
        method: isCreate ? 'POST' : 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Не удалось сохранить (${res.status}): ${txt.slice(0, 200)}`)
      }
      setOpen(false)
      if (isCreate) {
        const created = (await res.json().catch(() => null)) as { doc?: { slug?: string } } | null
        const slug = created?.doc?.slug
        if (slug) {
          router.push(`${locale === 'tt' ? '/tt' : ''}/novosti/${encodeURIComponent(slug)}`)
          return
        }
      }
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
        {isCreate ? '+ Добавить новость' : '✎ Редактировать новость'}
        {locale === 'tt' ? ' (татарча)' : ''}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isCreate ? 'Новая новость' : 'Редактирование новости'}
        description="Заголовок, анонс, обложка, текст с картинками и видео по ссылке."
        wide
        footer={
          <>
            <button type="button" className="edit-btn" onClick={() => setOpen(false)} disabled={saving}>
              Отмена
            </button>
            <button type="button" className="btn btn-gold" onClick={save} disabled={saving || loading}>
              {saving ? 'Сохраняем…' : isCreate ? 'Опубликовать' : 'Сохранить'}
            </button>
          </>
        }
      >
        {loading ? (
          <p className="edit-muted">Загружаем…</p>
        ) : (
          <div className="edit-form">
            <label className="edit-field">
              <span className="edit-field__label">Заголовок</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="edit-input" />
            </label>
            <label className="edit-field">
              <span className="edit-field__label">Анонс (краткий текст в ленте, необязательно)</span>
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="edit-textarea" rows={2} />
            </label>

            <div className="edit-field">
              <span className="edit-field__label">Обложка</span>
              <InlineImage
                previewUrl={coverUrl}
                alt={title || 'Обложка новости'}
                allowRemove
                onChange={(mid, url) => {
                  setCoverId(mid)
                  setCoverUrl(url)
                }}
                onError={setError}
              />
            </div>

            <div className="edit-field">
              <span className="edit-field__label">Текст новости (картинки — кнопкой в панели редактора)</span>
              {bodyUnsupported ? (
                <p className="edit-muted">
                  Текст этой новости содержит сложные блоки — правьте его в{' '}
                  <a href="/admin" target="_blank" rel="noopener noreferrer">
                    /admin
                  </a>
                  . Остальные поля можно сохранять здесь.
                </p>
              ) : (
                <LiteRichTextEditor initialHtml={bodyHtml} onChange={setBodyHtml} onError={setError} />
              )}
            </div>

            <div className="edit-field">
              <span className="edit-field__label">Видео по ссылке ({videos.length})</span>
              <p className="edit-muted">
                Видео не заливается на сайт: вставьте ссылку на ролик VK, Rutube или YouTube — на странице появится
                плеер.
              </p>
              {videos.map((v, idx) => (
                <div key={v.uid} className="edit-photo-row">
                  <div className="edit-photo-row__head">
                    <span className="edit-photo-row__num">
                      Видео {idx + 1}
                      {v.url.trim() ? (videoEmbedSrc(v.url) ? ' · ✓ ссылка распознана' : ' · ⚠ не распознана') : ''}
                    </span>
                    <span className="edit-photo-row__tools">
                      <button type="button" className="edit-link-danger" onClick={() => removeVideo(v.uid)}>
                        удалить
                      </button>
                    </span>
                  </div>
                  <input
                    type="url"
                    value={v.url}
                    placeholder="https://vk.com/video…  ·  https://rutube.ru/video/…  ·  https://youtu.be/…"
                    onChange={(e) => updateVideo(v.uid, { url: e.target.value })}
                    className="edit-input"
                  />
                  <input
                    type="text"
                    value={v.title}
                    placeholder="Название (необязательно)"
                    onChange={(e) => updateVideo(v.uid, { title: e.target.value })}
                    className="edit-input"
                  />
                </div>
              ))}
              <button type="button" className="edit-btn edit-btn--sm" onClick={addVideo}>
                + Добавить видео
              </button>
            </div>

            {error ? <p className="edit-error">{error}</p> : null}
          </div>
        )}
      </Modal>
    </div>
  )
}
