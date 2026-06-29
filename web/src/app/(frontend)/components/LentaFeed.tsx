'use client'

import { useEffect, useMemo, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { ugcHeaders, unlikeSubmission } from '../../../lib/ugcClient'
import { LentaCard } from './LentaCard'
import { LentaLightbox } from './LentaLightbox'
import { LentaRatings } from './LentaRatings'
import { LentaUpload } from './LentaUpload'
import { PhotoBattle } from './PhotoBattle'
import { OwnedProvider } from './OwnedContext'
import type { BattlePhoto, LentaItem, LentaRatings as Ratings } from './lentaTypes'

// Открытый в лайтбоксе пост (по id — всегда берём свежий из items) + индекс кадра.
type OpenMedia = { id: number; mediaIndex: number }

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
  // Лайки (id постов) — состояние поднято сюда, чтобы карточка и лайтбокс показывали
  // ОДИН лайк синхронно. Гидрируем из localStorage после монтирования (анти-SSR-расхож.).
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set())
  useEffect(() => {
    const s = new Set<number>()
    try {
      for (const it of initialItems) if (localStorage.getItem(`ugc-liked:${it.id}`)) s.add(it.id)
    } catch {
      /* приватный режим — игнор */
    }
    setLikedIds(s)
  }, [initialItems])

  // Лайк/отмена (оптимистично): множество likedIds + счётчик в items; дедуп localStorage
  // + сервер (409 = уже лайкнули с этого IP → оставляем). Любая иная ошибка — откат.
  async function toggleLike(id: number) {
    const wasLiked = likedIds.has(id)
    const applied = (like: boolean) => {
      setLikedIds((prev) => {
        const nset = new Set(prev)
        if (like) nset.add(id)
        else nset.delete(id)
        return nset
      })
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, likeCount: Math.max(0, it.likeCount + (like ? 1 : -1)) } : it)),
      )
      try {
        if (like) localStorage.setItem(`ugc-liked:${id}`, '1')
        else localStorage.removeItem(`ugc-liked:${id}`)
      } catch {
        /* игнор */
      }
    }
    applied(!wasLiked)
    try {
      if (wasLiked) {
        const ok = await unlikeSubmission(id)
        if (!ok) applied(true) // сервер не снял (лайк из другого браузера) — вернуть
      } else {
        const res = await fetch('/api/submission-reactions', {
          method: 'POST',
          headers: ugcHeaders(), // + X-UGC-Owner → лайк привязан к браузеру (для отмены)
          body: JSON.stringify({ submission: id }),
        })
        if (!res.ok && res.status !== 409) applied(false) // откат
      }
    } catch {
      applied(wasLiked) // вернуть как было
    }
  }

  // Убрать пост из ленты (после удаления своего/персоналом) + закрыть лайтбокс, если он на нём.
  function removeItem(id: number) {
    setItems((prev) => prev.filter((it) => it.id !== id))
    setOpen((o) => (o && o.id === id ? null : o))
  }
  // Игра «Фотобитва» (PR3): открыта ли, и пул фото для пар. Пул — КАЖДЫЙ кадр КАЖДОГО
  // поста (мульти-файловые посты дают все свои фото, а не только обложку).
  const [battleOpen, setBattleOpen] = useState(false)
  const photos = useMemo(() => {
    const out: BattlePhoto[] = []
    for (const it of items) {
      it.media.forEach((m, idx) => {
        if (m.kind === 'photo') out.push({ subId: it.id, idx, mediaUrl: m.mediaUrl, authorName: it.authorName })
      })
    }
    return out
  }, [items])

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

  // Открытый пост берём СВЕЖИМ из items по id (likeCount/media актуальны после лайка/удаления).
  const openItem = open ? items.find((it) => it.id === open.id) ?? null : null

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
              liked={likedIds.has(item.id)}
              onToggleLike={() => toggleLike(item.id)}
              onOpenMedia={(mediaIndex) => setOpen({ id: item.id, mediaIndex })}
              onRemoved={removeItem}
            />
          ))}
        </ul>
      ) : (
        <div className="placeholder">{t(locale, 'lenta.empty')}</div>
      )}

      {openItem && open && (
        <LentaLightbox
          submissionId={openItem.id}
          media={openItem.media}
          index={Math.min(open.mediaIndex, openItem.media.length - 1)}
          caption={openItem.caption}
          authorName={openItem.authorName}
          liked={likedIds.has(openItem.id)}
          likeCount={openItem.likeCount}
          locale={locale}
          onClose={() => setOpen(null)}
          onToggleLike={() => toggleLike(openItem.id)}
          onRemoved={removeItem}
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
