'use client'

import { useEffect, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'

type Comment = { id: number; authorName: string | null; body: string; createdAt: string }
type Status = 'idle' | 'sending'

// Тред комментариев карточки ленты (PR5). Монтируется по раскрытию → лениво тянет
// видимые комментарии (публичный read отдаёт только status=visible) и форму добавления
// (постмодерация: виден сразу). onAdded — поднять счётчик на карточке.
export function LentaComments({
  submissionId,
  locale,
  onAdded,
}: {
  submissionId: number
  locale: Locale
  onAdded: () => void
}) {
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [body, setBody] = useState('')
  const [author, setAuthor] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [err, setErr] = useState<string | null>(null)

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

  async function submit() {
    const text = body.trim()
    if (!text) return
    setStatus('sending')
    setErr(null)
    try {
      const res = await fetch('/api/submission-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission: submissionId, authorName: author.trim() || undefined, body: text }),
      })
      if (!res.ok) {
        setStatus('idle')
        setErr(t(locale, 'form.netError'))
        return
      }
      const j = (await res.json()) as { doc?: Comment }
      if (j.doc) setComments((prev) => [...(prev ?? []), j.doc as Comment])
      onAdded()
      setBody('')
      setStatus('idle')
    } catch {
      setStatus('idle')
      setErr(t(locale, 'form.netError'))
    }
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
              {c.authorName && <span className="lenta-comment-author">{c.authorName}: </span>}
              <span className="lenta-comment-body">{c.body}</span>
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
