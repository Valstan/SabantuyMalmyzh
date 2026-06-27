'use client'

import { useEffect, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { LentaComments } from './LentaComments'
import type { LentaItem } from './lentaTypes'

// Карточка ленты с медиа и взаимодействием (PR5): лайк (оптимистично, дедуп localStorage
// + серверный 409), поделиться (Web Share), пожаловаться (POST content-report),
// комментарии (раскрываемый тред). Медиа грузится напрямую с Object Storage.
export function LentaCard({ item, locale }: { item: LentaItem; locale: Locale }) {
  const [playing, setPlaying] = useState(false)
  const [broken, setBroken] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(item.likeCount)
  const [reported, setReported] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(item.commentCount)
  const phaseLabel = t(locale, `lenta.phase.${item.phase}`)

  // localStorage — после гидрации (иначе SSR/CSR расходятся).
  useEffect(() => {
    try {
      if (localStorage.getItem(`ugc-liked:${item.id}`)) setLiked(true)
      if (localStorage.getItem(`ugc-reported:${item.id}`)) setReported(true)
    } catch {
      /* приватный режим — игнор */
    }
  }, [item.id])

  async function like() {
    if (liked) return
    setLiked(true)
    setLikeCount((c) => c + 1)
    try {
      localStorage.setItem(`ugc-liked:${item.id}`, '1')
    } catch {
      /* игнор */
    }
    try {
      const res = await fetch('/api/submission-reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission: item.id }),
      })
      // 409 = уже лайкнули с этого IP → оставляем как есть. Иные ошибки — откат.
      if (!res.ok && res.status !== 409) {
        setLiked(false)
        setLikeCount((c) => Math.max(0, c - 1))
      }
    } catch {
      setLiked(false)
      setLikeCount((c) => Math.max(0, c - 1))
    }
  }

  async function report() {
    if (reported) return
    setReported(true)
    try {
      localStorage.setItem(`ugc-reported:${item.id}`, '1')
    } catch {
      /* игнор */
    }
    try {
      await fetch('/api/content-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'submission', targetId: item.id }),
      })
    } catch {
      /* молча — пометка «пожаловались» уже стоит */
    }
  }

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href.split('#')[0] : ''
    const text = item.caption || t(locale, 'lenta.title')
    try {
      if (navigator.share) {
        await navigator.share({ title: t(locale, 'lenta.title'), text, url })
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`)
      }
    } catch {
      /* отмена — молча */
    }
  }

  return (
    <li className="lenta-card">
      <div className="lenta-media">
        {item.kind === 'video' ? (
          playing ? (
            <video
              className="lenta-video"
              src={item.mediaUrl}
              poster={item.posterUrl ?? undefined}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <button
              type="button"
              className="lenta-videobtn"
              onClick={() => setPlaying(true)}
              aria-label={t(locale, 'lenta.playVideo')}
            >
              {item.posterUrl && !broken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.posterUrl}
                  alt={item.caption || item.authorName || t(locale, 'lenta.video')}
                  loading="lazy"
                  onError={() => setBroken(true)}
                />
              ) : (
                <span className="lenta-fallback" aria-hidden="true">
                  🎬
                </span>
              )}
              <span className="lenta-play" aria-hidden="true">
                ▶
              </span>
            </button>
          )
        ) : !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.mediaUrl}
            alt={item.caption || item.authorName || 'Фото'}
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="lenta-fallback" aria-hidden="true">
            📷
          </span>
        )}
        <span className={`lenta-badge lenta-badge--${item.phase}`}>{phaseLabel}</span>
      </div>

      <div className="lenta-card-body">
        {item.caption && <p className="lenta-caption">{item.caption}</p>}
        {item.authorName && <span className="lenta-author">{item.authorName}</span>}

        <div className="lenta-actions">
          <button
            type="button"
            className={`lenta-act${liked ? ' is-on' : ''}`}
            onClick={like}
            aria-pressed={liked}
            aria-label={t(locale, 'lenta.like')}
          >
            {liked ? '❤' : '🤍'} {likeCount}
          </button>
          <button
            type="button"
            className={`lenta-act${commentsOpen ? ' is-on' : ''}`}
            onClick={() => setCommentsOpen((o) => !o)}
            aria-expanded={commentsOpen}
            aria-label={t(locale, 'lenta.comment')}
          >
            💬 {commentCount}
          </button>
          <button type="button" className="lenta-act" onClick={share} aria-label={t(locale, 'lenta.share')}>
            ↗
          </button>
          <button
            type="button"
            className="lenta-act lenta-act--report"
            onClick={report}
            disabled={reported}
            title={reported ? t(locale, 'lenta.reported') : t(locale, 'lenta.report')}
            aria-label={t(locale, 'lenta.report')}
          >
            {reported ? '✓' : '⚑'}
          </button>
        </div>

        {commentsOpen && (
          <LentaComments
            submissionId={item.id}
            locale={locale}
            onAdded={() => setCommentCount((c) => c + 1)}
          />
        )}
      </div>
    </li>
  )
}
