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

const dayLabelFmt = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
})

type Status = 'live' | 'next' | 'upcoming' | 'past'

function parse(d: string | null): number | null {
  if (!d) return null
  const t = new Date(d).getTime()
  return Number.isNaN(t) ? null : t
}

// Ключ локального дня (YYYY-MM-DD) — группировка/фильтр по дате без сдвига в UTC.
function dayKey(d: string): string {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate(),
  ).padStart(2, '0')}`
}

const STAR_KEY = 'sabantuy:my-program'

export function ScheduleList({ items }: { items: ScheduleItem[] }) {
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const [onlyStarred, setOnlyStarred] = useState(false)

  // «Моя программа» — отмеченные события хранятся в браузере (localStorage),
  // анонимно, без БД. Грузим после монтирования (на сервере localStorage нет),
  // поэтому до гидрации звёзды пустые — совпадает с SSR, без mismatch.
  const [starred, setStarred] = useState<Set<number>>(new Set())
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STAR_KEY)
      if (raw) setStarred(new Set((JSON.parse(raw) as number[]).filter((n) => typeof n === 'number')))
    } catch {
      /* приватный режим / повреждённое значение — игнорируем */
    }
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STAR_KEY, JSON.stringify([...starred]))
    } catch {
      /* квота/приватный режим — не критично */
    }
  }, [starred, hydrated])
  const toggleStar = (id: number) =>
    setStarred((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  // Часы на клиенте: «сейчас идёт / далее» считаем после монтирования, чтобы не
  // ловить hydration-mismatch (на сервере «сейчас» — это момент ISR-ревалидации).
  // Тик раз в минуту — статусы остаются живыми, не завися от staleness ISR.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Категории, реально присутствующие в расписании, в порядке CATEGORY_LABELS.
  const categories = useMemo(() => {
    const present = new Set(items.map((i) => i.category).filter(Boolean) as string[])
    return Object.keys(CATEGORY_LABELS).filter((c) => present.has(c))
  }, [items])

  // Дни фестиваля — уникальные локальные даты в хронологическом порядке.
  const days = useMemo(() => {
    const map = new Map<string, string>() // key → подпись
    for (const i of items) {
      if (!i.startDate || parse(i.startDate) === null) continue
      const key = dayKey(i.startDate)
      if (!map.has(key)) map.set(key, dayLabelFmt.format(new Date(i.startDate)))
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, label]) => ({ key, label }))
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

  const shown = useMemo(
    () =>
      items.filter(
        (i) =>
          (!activeCat || i.category === activeCat) &&
          (!activeDay || (i.startDate && dayKey(i.startDate) === activeDay)) &&
          (!onlyStarred || starred.has(i.id)),
      ),
    [items, activeCat, activeDay, onlyStarred, starred],
  )

  // Группировка по площадкам: секции в порядке первого появления (т.к. items уже
  // отсортированы по времени → площадка с самым ранним событием идёт первой).
  // События без площадки — отдельной секцией в конце (без заголовка, если площадок нет вовсе).
  const groups = useMemo(() => {
    const order: (string | null)[] = []
    const map = new Map<string | null, ScheduleItem[]>()
    for (const i of shown) {
      const v = i.venue?.trim() || null
      if (!map.has(v)) {
        map.set(v, [])
        order.push(v)
      }
      map.get(v)!.push(i)
    }
    const venued = order.filter((v): v is string => v !== null)
    const result = venued.map((v) => ({ key: v, label: v, items: map.get(v)! }))
    if (map.has(null)) {
      result.push({ key: '', label: venued.length ? 'Без площадки' : '', items: map.get(null)! })
    }
    return result
  }, [shown])

  return (
    <>
      {now !== null && (liveItems.length > 0 || nextItem) && (
        <div className="now-banner" role="status" aria-live="polite">
          {liveItems.length > 0 ? (
            <>
              <span className="now-banner-label">● Сейчас на фестивале</span>
              <span className="now-banner-body">{liveItems.map((i) => i.title).join(' · ')}</span>
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

      {items.length > 0 && (
        <div className="filters" role="group" aria-label="Личная программа">
          <button
            type="button"
            className={`chip star-chip${onlyStarred ? ' active' : ''}`}
            aria-pressed={onlyStarred}
            onClick={() => setOnlyStarred((v) => !v)}
          >
            ★ Моя программа{hydrated && starred.size > 0 ? ` (${starred.size})` : ''}
          </button>
        </div>
      )}

      {days.length > 1 && (
        <div className="filters" role="group" aria-label="Фильтр по дням">
          <button
            type="button"
            className={`chip${activeDay === null ? ' active' : ''}`}
            aria-pressed={activeDay === null}
            onClick={() => setActiveDay(null)}
          >
            Все дни
          </button>
          {days.map((d) => (
            <button
              key={d.key}
              type="button"
              className={`chip${activeDay === d.key ? ' active' : ''}`}
              aria-pressed={activeDay === d.key}
              onClick={() => setActiveDay(d.key)}
            >
              {d.label}
            </button>
          ))}
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

      {groups.length > 0 ? (
        groups.map((group) => (
          <section className="venue-group" key={group.key}>
            {group.label && <h3 className="venue-group-title">🎪 {group.label}</h3>}
            {group.items.map((event) => {
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
                    <button
                      type="button"
                      className={`star-btn${starred.has(event.id) ? ' on' : ''}`}
                      aria-pressed={starred.has(event.id)}
                      aria-label={starred.has(event.id) ? 'Убрать из моей программы' : 'Добавить в мою программу'}
                      title={starred.has(event.id) ? 'Убрать из моей программы' : 'В мою программу'}
                      onClick={() => toggleStar(event.id)}
                    >
                      {starred.has(event.id) ? '★' : '☆'}
                    </button>
                  </div>
                  <h4 className="schedule-item-title">
                    {href ? <Link href={href}>{event.title}</Link> : event.title}
                    {event.category && (
                      <span className="badge">{CATEGORY_LABELS[event.category]}</span>
                    )}
                  </h4>
                  {event.summary && <p>{event.summary}</p>}
                  {event.location && <p className="meta">📍 {event.location}</p>}
                  {event.registrationEnabled && href && (
                    <Link className="reg-badge" href={`${href}#register`}>
                      Запись открыта →
                    </Link>
                  )}
                </article>
              )
            })}
          </section>
        ))
      ) : (
        <div className="placeholder">
          {onlyStarred
            ? 'В вашей программе пока пусто. Отметьте ☆ у интересных событий — они появятся здесь и сохранятся в этом браузере.'
            : 'По выбранному фильтру событий нет.'}
        </div>
      )}
    </>
  )
}
