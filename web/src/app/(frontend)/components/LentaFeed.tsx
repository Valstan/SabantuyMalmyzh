'use client'

import { useMemo, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { LentaCard } from './LentaCard'
import { LentaLightbox } from './LentaLightbox'
import { LentaRatings } from './LentaRatings'
import { LentaUpload } from './LentaUpload'
import { PhotoBattle } from './PhotoBattle'
import { OwnedProvider } from './OwnedContext'
import type { LentaItem, LentaRatings as Ratings } from './lentaTypes'

// Открытый в лайтбоксе пост + индекс активного медиа внутри его галереи.
type OpenMedia = { item: LentaItem; mediaIndex: number }

type Sort = 'new' | 'likes' | 'views'
type PhaseFilter = 'all' | 'preparation' | 'festival'
type Tab = 'feed' | 'ratings'

// Клиентский контейнер ленты (PR4 + PR5): держит снимок публикаций (initialItems из
// ISR-сервера) + локально добавленные после загрузки; сортировка (Новое / Народный
// выбор) и фильтр фаз — в браузере. Так роут остаётся статически кэшируемым (без
// searchParams). Кнопка загрузки и карточки с взаимодействием — клиентские (PR5).
export function LentaFeed({
  initialItems,
  ratings,
  locale,
}: {
  initialItems: LentaItem[]
  ratings: Ratings
  locale: Locale
}) {
  const [items, setItems] = useState<LentaItem[]>(initialItems)
  const [tab, setTab] = useState<Tab>('feed')
  const [sort, setSort] = useState<Sort>('new')
  const [phase, setPhase] = useState<PhaseFilter>('all')
  // Открытый в лайтбоксе пост и активный кадр его галереи (null — закрыт).
  const [open, setOpen] = useState<OpenMedia | null>(null)
  // Игра «Фотобитва» (PR3): открыта ли, и пул фото для пар.
  const [battleOpen, setBattleOpen] = useState(false)
  const photos = useMemo(() => items.filter((i) => i.kind === 'photo'), [items])

  const view = useMemo(() => {
    // items в порядке «Новое» (сервер отдал по -createdAt; новые загрузки prepend'ятся).
    const filtered = phase === 'all' ? items : items.filter((i) => i.phase === phase)
    if (sort === 'likes') return [...filtered].sort((a, b) => b.likeCount - a.likeCount)
    if (sort === 'views') return [...filtered].sort((a, b) => b.viewCount - a.viewCount)
    return filtered
  }, [items, sort, phase])

  const sorts: { key: Sort; label: string }[] = [
    { key: 'new', label: t(locale, 'lenta.sort.new') },
    { key: 'likes', label: t(locale, 'lenta.sort.likes') },
    { key: 'views', label: t(locale, 'lenta.sort.views') },
  ]
  const phases: { key: PhaseFilter; label: string }[] = [
    { key: 'all', label: t(locale, 'lenta.phase.all') },
    { key: 'preparation', label: t(locale, 'lenta.phase.preparation') },
    { key: 'festival', label: t(locale, 'lenta.phase.festival') },
  ]

  const tabs: { key: Tab; label: string }[] = [
    { key: 'feed', label: t(locale, 'lenta.tab.feed') },
    { key: 'ratings', label: t(locale, 'lenta.tab.ratings') },
  ]

  return (
    <OwnedProvider>
    <div className="lenta">
      <div className="lenta-tabs" role="tablist" aria-label={t(locale, 'lenta.title')}>
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            role="tab"
            aria-selected={tab === tb.key}
            className={`lenta-tab${tab === tb.key ? ' is-active' : ''}`}
            onClick={() => setTab(tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'ratings' ? (
        <LentaRatings ratings={ratings} locale={locale} />
      ) : (
      <>
      <div className="lenta-top">
        <LentaUpload locale={locale} onUploaded={(item) => setItems((prev) => [item, ...prev])} />
        {items.length > 0 && (
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
        )}
      </div>

      {view.length > 0 ? (
        <ul className="lenta-grid">
          {view.map((item) => (
            <LentaCard
              key={item.id}
              item={item}
              locale={locale}
              onOpenMedia={(mediaIndex) => setOpen({ item, mediaIndex })}
              onRemoved={(id) => setItems((prev) => prev.filter((it) => it.id !== id))}
            />
          ))}
        </ul>
      ) : (
        <div className="placeholder">{t(locale, 'lenta.empty')}</div>
      )}

      {open && (
        <LentaLightbox
          media={open.item.media}
          index={open.mediaIndex}
          caption={open.item.caption}
          authorName={open.item.authorName}
          locale={locale}
          onClose={() => setOpen(null)}
          onNavigate={(i) => setOpen((o) => (o ? { ...o, mediaIndex: i } : o))}
        />
      )}
      </>
      )}

      {/* Плавающая кнопка «Фотобитвы» — всегда на виду (fixed), даже при прокрутке. */}
      {photos.length >= 2 && !battleOpen && (
        <button
          type="button"
          className="lenta-battle-fab"
          onClick={() => setBattleOpen(true)}
          aria-label={t(locale, 'battle.start')}
        >
          ⚔️ {t(locale, 'battle.start')}
        </button>
      )}
      {battleOpen && (
        <PhotoBattle photos={photos} locale={locale} onClose={() => setBattleOpen(false)} />
      )}
    </div>
    </OwnedProvider>
  )
}
