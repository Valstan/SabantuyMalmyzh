'use client'

import { useEffect, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { deleteComment, editComment, isMine, markMine, ugcHeaders } from '../../../lib/ugcClient'
import { useOwned } from './OwnedContext'
import { useAdminMode } from './edit/AdminMode'

type Comment = { id: number; authorName: string | null; body: string; createdAt: string }
type Status = 'idle' | 'sending'

// Тред комментариев карточки ленты (PR5 + PR4 «управление своим»). Монтируется по
// раскрытию → лениво тянет видимые комментарии и форму добавления (постмодерация:
// виден сразу). Свой комментарий (по токену) можно править/удалить; персонал в режиме
// «Редактирование» — любой. onAdded/onRemoved — двигать счётчик на карточке.
export function LentaComments({
  submissionId,
  locale,
  onAdded,
  onRemoved,
}: {
  submissionId: number
  locale: Locale
  onAdded: () => void
  onRemoved: () => void
}) {
  const { isAdmin, mode } = useAdminMode()
  const owned = useOwned()
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [body, setBody] = useState('')
  const [author, setAuthor] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [err, setErr] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    let alive = true
    const qs = `where[submission][equals]=${submissionId}&where[status][equals]=visible&sort=createdAt&limit=100&depth=0`
    fetch(`/api/submission-comments?${qs}`)
      .then((r) => (r.ok ? r.json() : { docs: [] }))
      .then((j) => {
        if (alive) setComments(Array.isArray(j.docs) ? j.docs : [])
      })
      .catch(() => {
        if (alive) setComments([])
      })
    return () => {
      alive = false
    }
  }, [submissionId])

  // «Своё» = по браузерному токену ИЛИ по VK-аккаунту (PR5B); персонал в режиме правки — любое.
  const canManage = (c: Comment) =>
    isMine('comment', c.id) || owned.comments.has(c.id) || (isAdmin && mode === 'manage')

  async function submit() {
    const text = body.trim()
    if (!text) return
    setStatus('sending')
    setErr(null)
    try {
      const res = await fetch('/api/submission-comments', {
        method: 'POST',
        headers: ugcHeaders(), // + X-UGC-Owner → сервер стампит ownerHash (владение)
        body: JSON.stringify({ submission: submissionId, authorName: author.trim() || undefined, body: text }),
      })
      if (!res.ok) {
        setStatus('idle')
        setErr(t(locale, 'form.netError'))
        return
      }
      const j = (await res.json()) as { doc?: Comment }
      if (j.doc) {
        markMine('comment', j.doc.id) // помним «моё» → покажем кнопки править/удалить
        setComments((prev) => [...(prev ?? []), j.doc as Comment])
      }
      onAdded()
      setBody('')
      setStatus('idle')
    } catch {
      setStatus('idle')
      setErr(t(locale, 'form.netError'))
    }
  }

  function startEdit(c: Comment) {
    setEditingId(c.id)
    setEditText(c.body)
    setErr(null)
  }

  async function saveEdit(id: number) {
    const text = editText.trim()
    if (!text) return
    const newBody = await editComment(id, text)
    if (newBody === null) {
      setErr(t(locale, 'lenta.actionError'))
      return
    }
    setComments((prev) => (prev ?? []).map((c) => (c.id === id ? { ...c, body: newBody } : c)))
    setEditingId(null)
    setEditText('')
  }

  async function removeComment(id: number) {
    if (typeof window !== 'undefined' && !window.confirm(t(locale, 'lenta.confirmDeleteComment'))) return
    const ok = await deleteComment(id)
    if (!ok) {
      setErr(t(locale, 'lenta.actionError'))
      return
    }
    setComments((prev) => (prev ?? []).filter((c) => c.id !== id))
    onRemoved()
  }

  return (
    <div className="lenta-comments">
      {comments === null ? (
        <p className="lenta-comments-loading">…</p>
      ) : comments.length === 0 ? (
        <p className="lenta-comments-empty">{t(locale, 'lenta.comments.empty')}</p>
      ) : (
        <ul className="lenta-comments-list">
          {comments.map((c) => (
            <li key={c.id}>
              {editingId === c.id ? (
                <div className="lenta-comment-edit">
                  <textarea
                    value={editText}
                    maxLength={1000}
                    rows={2}
                    onChange={(e) => setEditText(e.target.value)}
                    aria-label={t(locale, 'lenta.edit')}
                  />
                  <div className="lenta-comment-edit-actions">
                    <button
                      type="button"
                      className="lenta-link-btn"
                      onClick={() => saveEdit(c.id)}
                      disabled={!editText.trim()}
                    >
                      {t(locale, 'lenta.save')}
                    </button>
                    <button type="button" className="lenta-link-btn" onClick={() => setEditingId(null)}>
                      {t(locale, 'lenta.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {c.authorName && <span className="lenta-comment-author">{c.authorName}: </span>}
                  <span className="lenta-comment-body">{c.body}</span>
                  {canManage(c) && (
                    <span className="lenta-comment-actions">
                      <button type="button" className="lenta-link-btn" onClick={() => startEdit(c)}>
                        {t(locale, 'lenta.edit')}
                      </button>
                      <button type="button" className="lenta-link-btn lenta-link-btn--danger" onClick={() => removeComment(c.id)}>
                        {t(locale, 'lenta.delete')}
                      </button>
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="lenta-comments-form">
        <input
          type="text"
          className="lenta-comments-name"
          placeholder={t(locale, 'lenta.comments.name')}
          value={author}
          maxLength={64}
          onChange={(e) => setAuthor(e.target.value)}
          disabled={status === 'sending'}
        />
        <textarea
          className="lenta-comments-input"
          placeholder={t(locale, 'lenta.comments.placeholder')}
          value={body}
          maxLength={1000}
          rows={2}
          onChange={(e) => setBody(e.target.value)}
          disabled={status === 'sending'}
        />
        {err && <p className="lenta-upload-error" role="alert">{err}</p>}
        <button
          type="button"
          className="btn-primary"
          onClick={submit}
          disabled={!body.trim() || status === 'sending'}
        >
          {status === 'sending' ? t(locale, 'lenta.comments.sending') : t(locale, 'lenta.comments.submit')}
        </button>
      </div>
    </div>
  )
}
