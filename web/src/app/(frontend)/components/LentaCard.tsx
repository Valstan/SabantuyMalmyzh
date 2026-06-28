'use client'

import { useEffect, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { deleteSubmission, isMine, ugcHeaders, unlikeSubmission } from '../../../lib/ugcClient'
import { LentaComments } from './LentaComments'
import { useAdminMode } from './edit/AdminMode'
import type { LentaItem } from './lentaTypes'

// Карточка ленты с медиа и взаимодействием (PR5): лайк/отмена (оптимистично, дедуп
// localStorage + серверный 409), поделиться (Web Share), пожаловаться, комментарии
// (раскрываемый тред). Управление своим (PR4): удалить свою публикацию (по токену) —
// и персонал в режиме «Редактирование» удаляет любую. Медиа — напрямую с Object Storage.
export function LentaCard({
  item,
  locale,
  onRemoved,
  onOpenMedia,
}: {
  item: LentaItem
  locale: Locale
  onRemoved?: (id: number) => void
  onOpenMedia?: () => void
}) {
  const { isAdmin, mode } = useAdminMode()
  const [broken, setBroken] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(item.likeCount)
  const [reported, setReported] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(item.commentCount)
  const [mine, setMine] = useState(false)
  const [actErr, setActErr] = useState(false)
  const phaseLabel = t(locale, `lenta.phase.${item.phase}`)

  // «Моё»/лайк/жалоба — из localStorage после гидрации (иначе SSR/CSR расходятся).
  useEffect(() => {
    try {
      if (localStorage.getItem(`ugc-liked:${item.id}`)) setLiked(true)
      if (localStorage.getItem(`ugc-reported:${item.id}`)) setReported(true)
    } catch {
      /* приватный режим — игнор */
    }
    setMine(isMine('submission', item.id))
  }, [item.id])

  // Удалять можно своё (по токену) ИЛИ любое, если ты персонал в режиме «Редактирование».
  const canDelete = mine || (isAdmin && mode === 'manage')

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
        headers: ugcHeaders(), // + X-UGC-Owner → лайк привязан к браузеру (для отмены)
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

  async function unlike() {
    if (!liked) return
    setLiked(false)
    setLikeCount((c) => Math.max(0, c - 1))
    try {
      localStorage.removeItem(`ugc-liked:${item.id}`)
    } catch {
      /* игнор */
    }
    const ok = await unlikeSubmission(item.id)
    if (!ok) {
      // откат: сервер не снял (напр. лайк ставился до входа/из другого браузера)
      setLiked(true)
      setLikeCount((c) => c + 1)
      try {
        localStorage.setItem(`ugc-liked:${item.id}`, '1')
      } catch {
        /* игнор */
      }
    }
  }

  function toggleLike() {
    if (liked) void unlike()
    else void like()
  }

  async function del() {
    if (typeof window !== 'undefined' && !window.confirm(t(locale, 'lenta.confirmDelete'))) return
    setActErr(false)
    const ok = await deleteSubmission(item.id)
    if (ok) onRemoved?.(item.id)
    else setActErr(true)
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
        headers: ugcHeaders(),
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
          <button
            type="button"
            className="lenta-videobtn"
            onClick={() => onOpenMedia?.()}
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
        ) : !broken ? (
          <button
            type="button"
            className="lenta-mediabtn"
            onClick={() => onOpenMedia?.()}
            aria-label={t(locale, 'lenta.openPhoto')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.mediaUrl}
              alt={item.caption || item.authorName || 'Фото'}
              loading="lazy"
              onError={() => setBroken(true)}
            />
          </button>
        ) : (
          <span className="lenta-fallback" aria-hidden="true">
            📷
          </span>
        )}
        <span className={`lenta-badge lenta-badge--${item.phase}`}>{phaseLabel}</span>
      </div>

      <div className="lenta-card-body">
        {item.caption && <p className="lenta-caption">{item.caption}</p>}
        <span className="lenta-byline">
          {item.authorName && <span className="lenta-author">{item.authorName}</span>}
          {mine && <span className="lenta-mine">{t(locale, 'lenta.mineBadge')}</span>}
        </span>

        <div className="lenta-actions">
          <button
            type="button"
            className={`lenta-act${liked ? ' is-on' : ''}`}
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={t(locale, liked ? 'lenta.unlike' : 'lenta.like')}
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
          {canDelete && (
            <button
              type="button"
              className="lenta-act lenta-act--danger"
              onClick={del}
              title={t(locale, 'lenta.delete')}
              aria-label={t(locale, 'lenta.delete')}
            >
              🗑
            </button>
          )}
        </div>
        {actErr && (
          <p className="lenta-act-err" role="alert">
            {t(locale, 'lenta.actionError')}
          </p>
        )}

        {commentsOpen && (
          <LentaComments
            submissionId={item.id}
            locale={locale}
            onAdded={() => setCommentCount((c) => c + 1)}
            onRemoved={() => setCommentCount((c) => Math.max(0, c - 1))}
          />
        )}
      </div>
    </li>
  )
}
