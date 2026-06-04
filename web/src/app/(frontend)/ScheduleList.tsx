'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { CATEGORY_LABELS } from '../../lib/categories'

export type ScheduleItem = {
  id: number
  slug: string | null
  title: string
  summary: string | null
  location: string | null
  venue: string | null
  startDate: string | null
  endDate: string | null
  category: string | null
  registrationEnabled: boolean
}

const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

const timeFmt = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
})

type Status = 'live' | 'next' | 'upcoming' | 'past'

function parse(d: string | null): number | null {
  if (!d) return null
  const t = new Date(d).getTime()
  return Number.isNaN(t) ? null : t
}

export function ScheduleList({ items }: { items: ScheduleItem[] }) {
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [activeVenue, setActiveVenue] = useState<string | null>(null)
  // Часы на клиенте: «сейчас идёт / далее» считаем после монтирования, чтобы не
  // ловить hydration-mismatch (на сервере «сейчас» — это момент ISR-ревалидации).
  // Тик раз в минуту — статусы остаются живыми, не завися от staleness ISR.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Категории и площадки, реально присутствующие в расписании.
  const categories = useMemo(() => {
    const present = new Set(items.map((i) => i.category).filter(Boolean) as string[])
    return Object.keys(CATEGORY_LABELS).filter((c) => present.has(c))
  }, [items])

  const venues = useMemo(() => {
    const seen: string[] = []
    for (const i of items) {
      const v = i.venue?.trim()
      if (v && !seen.includes(v)) seen.push(v)
    }
    return seen
  }, [items])

  // Статус по времени считаем по ВСЕМУ расписанию (фестиваль-wide «сейчас»),
  // независимо от активных фильтров. «next» — единственное ближайшее будущее.
  const statusById = useMemo(() => {
    const map = new Map<number, Status>()
    if (now === null) return map
    let nextId: number | null = null
    let nextStart = Infinity
    for (const i of items) {
      const start = parse(i.startDate)
      if (start === null) continue
      const end = parse(i.endDate)
      if (end !== null && start <= now && now <= end) {
        map.set(i.id, 'live')
      } else if (start > now) {
        map.set(i.id, 'upcoming')
        if (start < nextStart) {
          nextStart = start
          nextId = i.id
        }
      } else {
        map.set(i.id, 'past')
      }
    }
    if (nextId !== null) map.set(nextId, 'next')
    return map
  }, [items, now])

  const liveItems = useMemo(
    () => items.filter((i) => statusById.get(i.id) === 'live'),
    [items, statusById],
  )
  const nextItem = useMemo(
    () => items.find((i) => statusById.get(i.id) === 'next') ?? null,
    [items, statusById],
  )

  const shown = items.filter(
    (i) =>
      (!activeCat || i.category === activeCat) &&
      (!activeVenue || i.venue?.trim() === activeVenue),
  )

  return (
    <>
      {now !== null && (liveItems.length > 0 || nextItem) && (
        <div className="now-banner" role="status" aria-live="polite">
          {liveItems.length > 0 ? (
            <>
              <span className="now-banner-label">● Сейчас на фестивале</span>
              <span className="now-banner-body">
                {liveItems.map((i) => i.title).join(' · ')}
              </span>
            </>
          ) : (
            nextItem && (
              <>
                <span className="now-banner-label next">Далее</span>
                <span className="now-banner-body">
                  {nextItem.title}
                  {nextItem.startDate && ` — ${timeFmt.format(new Date(nextItem.startDate))}`}
                  {nextItem.venue && ` · ${nextItem.venue}`}
                </span>
              </>
            )
          )}
        </div>
      )}

      {categories.length > 0 && (
        <div className="filters" role="group" aria-label="Фильтр по категориям">
          <button
            type="button"
            className={`chip${activeCat === null ? ' active' : ''}`}
            aria-pressed={activeCat === null}
            onClick={() => setActiveCat(null)}
          >
            Все категории
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${activeCat === c ? ' active' : ''}`}
              aria-pressed={activeCat === c}
              onClick={() => setActiveCat(c)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      )}

      {venues.length > 0 && (
        <div className="filters" role="group" aria-label="Фильтр по площадкам">
          <button
            type="button"
            className={`chip${activeVenue === null ? ' active' : ''}`}
            aria-pressed={activeVenue === null}
            onClick={() => setActiveVenue(null)}
          >
            Все площадки
          </button>
          {venues.map((v) => (
            <button
              key={v}
              type="button"
              className={`chip${activeVenue === v ? ' active' : ''}`}
              aria-pressed={activeVenue === v}
              onClick={() => setActiveVenue(v)}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {shown.length > 0 ? (
        shown.map((event) => {
          const href = event.slug ? `/events/${encodeURIComponent(event.slug)}` : undefined
          const status = statusById.get(event.id)
          return (
            <article
              className={`schedule-item${status === 'live' ? ' is-live' : ''}${
                status === 'next' ? ' is-next' : ''
              }`}
              key={event.id}
            >
              <div className="schedule-item-head">
                {event.startDate && <time>{dateFmt.format(new Date(event.startDate))}</time>}
                {status === 'live' && <span className="status-badge live">● Идёт сейчас</span>}
                {status === 'next' && <span className="status-badge next">Далее</span>}
              </div>
              <h3>
                {href ? <Link href={href}>{event.title}</Link> : event.title}
                {event.category && <span className="badge">{CATEGORY_LABELS[event.category]}</span>}
              </h3>
              {event.summary && <p>{event.summary}</p>}
              {event.venue && <p className="meta">🎪 {event.venue}</p>}
              {event.location && <p className="meta">📍 {event.location}</p>}
              {event.registrationEnabled && href && (
                <Link className="reg-badge" href={`${href}#register`}>
                  Запись открыта →
                </Link>
              )}
            </article>
          )
        })
      ) : (
        <div className="placeholder">По выбранному фильтру событий нет.</div>
      )}
    </>
  )
}
