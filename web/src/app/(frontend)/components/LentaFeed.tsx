'use client'

import { useMemo, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'

// Карточка ленты — данные, подготовленные сервером (LentaView). Медиа-URL уже указывает
// на Object Storage (publicUrl), браузер грузит напрямую.
export type LentaItem = {
  id: number
  kind: 'photo' | 'video'
  mediaUrl: string
  posterUrl: string | null
  authorName: string | null
  caption: string | null
  phase: 'preparation' | 'festival'
  likeCount: number
  commentCount: number
  width: number | null
  height: number | null
}

type Sort = 'new' | 'top'
type PhaseFilter = 'all' | 'preparation' | 'festival'

// Клиентская лента: сортировка (Новое / Народный выбор) и фильтр фаз — в браузере, по
// снимку, который сервер отдал из ISR-кэша. Так роут остаётся статически кэшируемым
// (без searchParams/headers). Кнопки лайк/коммент/жалоба + загрузка — в PR5.
export function LentaFeed({ items, locale }: { items: LentaItem[]; locale: Locale }) {
  const [sort, setSort] = useState<Sort>('new')
  const [phase, setPhase] = useState<PhaseFilter>('all')

  const view = useMemo(() => {
    // items уже отсортированы сервером по -createdAt (порядок = «Новое»).
    const filtered = phase === 'all' ? items : items.filter((i) => i.phase === phase)
    if (sort === 'top') {
      return [...filtered].sort((a, b) => b.likeCount - a.likeCount)
    }
    return filtered
  }, [items, sort, phase])

  const sorts: { key: Sort; label: string }[] = [
    { key: 'new', label: t(locale, 'lenta.sort.new') },
    { key: 'top', label: t(locale, 'lenta.sort.top') },
  ]
  const phases: { key: PhaseFilter; label: string }[] = [
    { key: 'all', label: t(locale, 'lenta.phase.all') },
    { key: 'preparation', label: t(locale, 'lenta.phase.preparation') },
    { key: 'festival', label: t(locale, 'lenta.phase.festival') },
  ]

  return (
    <div className="lenta">
      <div className="lenta-controls" role="group" aria-label={t(locale, 'lenta.title')}>
        <div className="lenta-filter">
          {sorts.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`lenta-chip${sort === s.key ? ' is-active' : ''}`}
              aria-pressed={sort === s.key}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="lenta-filter">
          {phases.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`lenta-chip${phase === p.key ? ' is-active' : ''}`}
              aria-pressed={phase === p.key}
              onClick={() => setPhase(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {view.length > 0 ? (
        <ul className="lenta-grid">
          {view.map((item) => (
            <LentaCard key={item.id} item={item} locale={locale} />
          ))}
        </ul>
      ) : (
        <div className="placeholder">{t(locale, 'lenta.empty')}</div>
      )}
    </div>
  )
}

function LentaCard({ item, locale }: { item: LentaItem; locale: Locale }) {
  const [playing, setPlaying] = useState(false)
  const [broken, setBroken] = useState(false)
  const phaseLabel = t(locale, `lenta.phase.${item.phase}`)

  return (
    <li className="lenta-card">
      <div className="lenta-media">
        {item.kind === 'video' ? (
          playing ? (
            // Видео монтируется только по клику (без автоплея + экономия egress).
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
        <div className="lenta-meta">
          {item.authorName && <span className="lenta-author">{item.authorName}</span>}
          <span className="lenta-stats">
            <span title={t(locale, 'lenta.likes')}>❤ {item.likeCount}</span>
            <span title={t(locale, 'lenta.comments')}>💬 {item.commentCount}</span>
          </span>
        </div>
      </div>
    </li>
  )
}
