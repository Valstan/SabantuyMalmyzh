'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { CATEGORY_LABELS } from '../../lib/categories'

export type ScheduleItem = {
  id: number
  slug: string | null
  title: string
  summary: string | null
  location: string | null
  startDate: string | null
  category: string | null
  registrationEnabled: boolean
}

const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

export function ScheduleList({ items }: { items: ScheduleItem[] }) {
  const [active, setActive] = useState<string | null>(null)

  // Категории, реально присутствующие в расписании, в порядке CATEGORY_LABELS.
  const categories = useMemo(() => {
    const present = new Set(items.map((i) => i.category).filter(Boolean) as string[])
    return Object.keys(CATEGORY_LABELS).filter((c) => present.has(c))
  }, [items])

  const shown = active ? items.filter((i) => i.category === active) : items

  return (
    <>
      {categories.length > 0 && (
        <div className="filters" role="group" aria-label="Фильтр по категориям">
          <button
            type="button"
            className={`chip${active === null ? ' active' : ''}`}
            aria-pressed={active === null}
            onClick={() => setActive(null)}
          >
            Все
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${active === c ? ' active' : ''}`}
              aria-pressed={active === c}
              onClick={() => setActive(c)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      )}

      {shown.length > 0 ? (
        shown.map((event) => {
          const href = event.slug ? `/events/${encodeURIComponent(event.slug)}` : undefined
          return (
            <article className="schedule-item" key={event.id}>
              {event.startDate && <time>{dateFmt.format(new Date(event.startDate))}</time>}
              <h3>
                {href ? <Link href={href}>{event.title}</Link> : event.title}
                {event.category && <span className="badge">{CATEGORY_LABELS[event.category]}</span>}
              </h3>
              {event.summary && <p>{event.summary}</p>}
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
        <div className="placeholder">В этой категории пока нет событий.</div>
      )}
    </>
  )
}
