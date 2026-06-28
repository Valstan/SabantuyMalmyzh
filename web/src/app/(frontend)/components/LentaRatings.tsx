'use client'

import { useMemo, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import type { LentaAuthorStat, LentaRatings as Ratings, LentaTopItem } from './lentaTypes'

type AuthorSort = 'likes' | 'views' | 'posts'

// Вкладка «Рейтинг» (PR2): ТОП VK-авторов (с переключателем меры) + ТОП роликов по
// лайкам и по просмотрам в системе. Данные считает сервер (LentaView) по всем видимым
// публикациям; здесь только показ + клиентская пересортировка авторов. Только VK-авторы
// в рейтинге — у них надёжная личность с именем/аватаром (решение владельца).
export function LentaRatings({ ratings, locale }: { ratings: Ratings; locale: Locale }) {
  const [authorSort, setAuthorSort] = useState<AuthorSort>('likes')

  const authors = useMemo(() => {
    const arr = [...ratings.authors]
    if (authorSort === 'views') arr.sort((a, b) => b.totalViews - a.totalViews || b.totalLikes - a.totalLikes)
    else if (authorSort === 'posts') arr.sort((a, b) => b.postCount - a.postCount || b.totalLikes - a.totalLikes)
    else arr.sort((a, b) => b.totalLikes - a.totalLikes || b.totalViews - a.totalViews)
    return arr
  }, [ratings.authors, authorSort])

  const authorSorts: { key: AuthorSort; label: string }[] = [
    { key: 'likes', label: t(locale, 'lenta.sort.likes') },
    { key: 'views', label: t(locale, 'lenta.sort.views') },
    { key: 'posts', label: t(locale, 'rating.byPosts') },
  ]

  const hasAny =
    ratings.authors.length > 0 || ratings.topByLikes.length > 0 || ratings.topByViews.length > 0

  if (!hasAny) {
    return <div className="placeholder">{t(locale, 'rating.empty')}</div>
  }

  return (
    <div className="rating">
      {/* ── ТОП авторов (только VK) ─────────────────────────────────────── */}
      <section className="rating-block">
        <div className="rating-head">
          <h3 className="rating-title">{t(locale, 'rating.authors')}</h3>
          <div className="lenta-filter" role="group" aria-label={t(locale, 'rating.authors')}>
            {authorSorts.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`lenta-chip${authorSort === s.key ? ' is-active' : ''}`}
                aria-pressed={authorSort === s.key}
                onClick={() => setAuthorSort(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {authors.length > 0 ? (
          <ol className="rating-authors">
            {authors.map((a, i) => (
              <AuthorRow key={a.visitorId} rank={i + 1} author={a} locale={locale} />
            ))}
          </ol>
        ) : (
          <p className="rating-note">{t(locale, 'rating.authorsEmpty')}</p>
        )}
      </section>

      {/* ── ТОП роликов по лайкам ───────────────────────────────────────── */}
      <TopList
        title={t(locale, 'rating.topLikes')}
        items={ratings.topByLikes}
        metric="likes"
        locale={locale}
      />

      {/* ── ТОП роликов по просмотрам ───────────────────────────────────── */}
      <TopList
        title={t(locale, 'rating.topViews')}
        items={ratings.topByViews}
        metric="views"
        locale={locale}
      />
    </div>
  )
}

function initials(name: string | null): string {
  if (!name) return '👤'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '👤'
}

function AuthorRow({ rank, author, locale }: { rank: number; author: LentaAuthorStat; locale: Locale }) {
  const [broken, setBroken] = useState(false)
  return (
    <li className="rating-author">
      <span className="rating-rank" aria-hidden="true">
        {rank}
      </span>
      <span className="rating-avatar">
        {author.avatarUrl && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.avatarUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
          />
        ) : (
          <span aria-hidden="true">{initials(author.name)}</span>
        )}
      </span>
      <span className="rating-name">{author.name || t(locale, 'rating.anon')}</span>
      <span className="rating-stats">
        <span title={t(locale, 'rating.byPosts')}>🖼 {author.postCount}</span>
        <span title={t(locale, 'lenta.likes')}>❤ {author.totalLikes}</span>
        <span title={t(locale, 'lenta.views')}>👁 {author.totalViews}</span>
      </span>
    </li>
  )
}

function TopList({
  title,
  items,
  metric,
  locale,
}: {
  title: string
  items: LentaTopItem[]
  metric: 'likes' | 'views'
  locale: Locale
}) {
  return (
    <section className="rating-block">
      <h3 className="rating-title">{title}</h3>
      {items.length > 0 ? (
        <ol className="rating-top">
          {items.map((it, i) => (
            <TopRow key={it.id} rank={i + 1} item={it} metric={metric} locale={locale} />
          ))}
        </ol>
      ) : (
        <p className="rating-note">{t(locale, 'rating.topEmpty')}</p>
      )}
    </section>
  )
}

function TopRow({
  rank,
  item,
  metric,
  locale,
}: {
  rank: number
  item: LentaTopItem
  metric: 'likes' | 'views'
  locale: Locale
}) {
  const [broken, setBroken] = useState(false)
  const thumb = item.kind === 'video' ? item.posterUrl : item.mediaUrl
  const value = metric === 'likes' ? item.likeCount : item.viewCount
  return (
    <li className="rating-top-item">
      <span className="rating-rank" aria-hidden="true">
        {rank}
      </span>
      <span className="rating-thumb">
        {thumb && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <span className="lenta-fallback" aria-hidden="true">
            {item.kind === 'video' ? '🎬' : '📷'}
          </span>
        )}
      </span>
      <span className="rating-top-author">{item.authorName || t(locale, 'rating.anon')}</span>
      <span className="rating-top-metric">
        {metric === 'likes' ? '❤' : '👁'} {value}
      </span>
    </li>
  )
}
