'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import { Modal } from './edit/Modal'

// Живой трекер программы «Сейчас и далее» — плавающая кнопка на всех страницах
// (монтируется в SiteChrome) + модалка: что идёт прямо сейчас и где, что будет
// следующим (несколько, если стартуют почти одновременно) и через сколько минут.
// Данные тянем клиентом из публичного REST (`/api/events`, read = published) —
// ISR страниц не трогаем, счётчик всегда живой независимо от staleness кэша.
// Кнопка появляется только когда праздник близко (<24ч до ближайшего события)
// или идёт — в межсезонье не мешает.

type TrackerEvent = {
  id: number
  slug: string | null
  title: string
  venue: string | null
  location: string | null
  start: number
  end: number | null
}

// «Почти одновременно»: события, стартующие в пределах 20 минут от ближайшего,
// показываем одним блоком «Далее».
const CLUSTER_MS = 20 * 60_000
// Кнопка появляется за сутки до ближайшего события.
const SHOW_BEFORE_MS = 24 * 3_600_000
// Событие без указанного конца считаем «идёт» 45 минут после старта.
const NO_END_GRACE_MS = 45 * 60_000
// Напоминание — за 10 минут до начала.
const REMIND_BEFORE_MS = 10 * 60_000
const REMINDERS_KEY = 'sabantuy:event-reminders'

type ReminderState = Record<string, 'pending' | 'fired'>

function loadReminders(): ReminderState {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY)
    if (raw) return JSON.parse(raw) as ReminderState
  } catch {
    /* приватный режим / битое значение */
  }
  return {}
}

function saveReminders(state: ReminderState) {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(state))
  } catch {
    /* не критично */
  }
}

const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

// «через 1 ч 05 мин» / «через 12 мин» / «через 40 сек» — по локали.
function fmtDelta(ms: number, locale: Locale, withSeconds = false): string {
  const u =
    locale === 'tt'
      ? { in: '', h: 'сәг', m: 'мин', s: 'сек', suffix: 'аннан соң' }
      : { in: 'через', h: 'ч', m: 'мин', s: 'сек', suffix: '' }
  const totalSec = Math.max(0, Math.round(ms / 1000))
  let body: string
  if (totalSec < 60) body = `${totalSec} ${u.s}`
  else if (withSeconds && totalSec < 600) {
    // Большой отсчёт в модалке: под 10 минут секунды тикают «на глазах».
    body = `${Math.floor(totalSec / 60)} ${u.m} ${String(totalSec % 60).padStart(2, '0')} ${u.s}`
  } else {
    const totalMin = Math.ceil(totalSec / 60)
    if (totalMin < 60) body = `${totalMin} ${u.m}`
    else body = `${Math.floor(totalMin / 60)} ${u.h} ${String(totalMin % 60).padStart(2, '0')} ${u.m}`
  }
  return [u.in, body, u.suffix].filter(Boolean).join(' ')
}

// Экранирование текста для iCalendar (RFC 5545).
const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const icsDate = (ts: number) => new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

// .ics с VALARM за 10 минут — телефон открывает файл календарём и сам ставит
// напоминание-«будильник». Самый надёжный путь без push-сервера.
function downloadIcs(ev: TrackerEvent, locale: Locale) {
  const end = ev.end ?? ev.start + NO_END_GRACE_MS
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sabantuy v Malmyzhe//RU',
    'BEGIN:VEVENT',
    `UID:event-${ev.id}@sabantuy`,
    `DTSTAMP:${icsDate(Date.now())}`,
    `DTSTART:${icsDate(ev.start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    ...(ev.venue || ev.location ? [`LOCATION:${icsEscape([ev.venue, ev.location].filter(Boolean).join(', '))}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(ev.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${ev.slug || `event-${ev.id}`}.ics`
  a.click()
  URL.revokeObjectURL(url)
  void locale
}

// Показ уведомления: через SW (надёжнее в установленной PWA), фолбэк — Notification.
async function showNotification(title: string, body: string, tag: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, tag, icon: '/icons/icon-192.png' })
      return
    }
  } catch {
    /* SW недоступен — фолбэк ниже */
  }
  try {
    new Notification(title, { body, tag, icon: '/icons/icon-192.png' })
  } catch {
    /* нет поддержки — молча */
  }
}

export function EventTracker({ locale }: { locale: Locale }) {
  const [events, setEvents] = useState<TrackerEvent[] | null>(null)
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState<number | null>(null)
  const [reminders, setReminders] = useState<ReminderState>({})
  const [notifDenied, setNotifDenied] = useState(false)
  const remindersRef = useRef(reminders)
  remindersRef.current = reminders

  // Загрузка программы: на монтировании + смене локали, освежаем раз в 5 минут
  // (в /admin могли подвинуть время).
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(
          `/api/events?where[_status][equals]=published&sort=startDate&limit=200&depth=0&locale=${locale}`,
          { credentials: 'same-origin' },
        )
        if (!res.ok) return
        const data = (await res.json()) as { docs?: Record<string, unknown>[] }
        if (cancelled || !Array.isArray(data.docs)) return
        const parsed: TrackerEvent[] = data.docs
          .map((d) => {
            const start = d.startDate ? new Date(String(d.startDate)).getTime() : NaN
            const end = d.endDate ? new Date(String(d.endDate)).getTime() : NaN
            return {
              id: Number(d.id),
              slug: typeof d.slug === 'string' ? d.slug : null,
              title: String(d.title ?? ''),
              venue: typeof d.venue === 'string' && d.venue.trim() ? d.venue : null,
              location: typeof d.location === 'string' && d.location.trim() ? d.location : null,
              start,
              end: Number.isNaN(end) ? null : end,
            }
          })
          .filter((e) => !Number.isNaN(e.start) && e.title)
        setEvents(parsed)
      } catch {
        /* сеть/офлайн — кнопка просто не появится или покажет прошлые данные */
      }
    }
    load()
    const id = setInterval(load, 5 * 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [locale])

  // Напоминалки из localStorage — один раз после монтирования.
  useEffect(() => {
    setReminders(loadReminders())
  }, [])

  // Часы: раз в секунду при открытой модалке (отсчёт «на глазах»), раз в 30с — в фоне.
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), open ? 1000 : 30_000)
    return () => clearInterval(id)
  }, [open])

  const { liveItems, nextItems, nextStart } = useMemo(() => {
    if (now === null || !events) return { liveItems: [], nextItems: [], nextStart: null as number | null }
    const live: TrackerEvent[] = []
    const upcoming: TrackerEvent[] = []
    for (const e of events) {
      const end = e.end ?? e.start + NO_END_GRACE_MS
      if (e.start <= now && now <= end) live.push(e)
      else if (e.start > now) upcoming.push(e)
    }
    upcoming.sort((a, b) => a.start - b.start)
    const first = upcoming[0]?.start ?? null
    const cluster = first === null ? [] : upcoming.filter((e) => e.start - first <= CLUSTER_MS)
    return { liveItems: live, nextItems: cluster, nextStart: first }
  }, [events, now])

  // Проверка напоминаний на каждом тике: пора → уведомление, ушло в прошлое → сброс.
  useEffect(() => {
    if (now === null || !events) return
    const state = remindersRef.current
    let changed = false
    const next: ReminderState = { ...state }
    for (const [key, status] of Object.entries(state)) {
      if (status !== 'pending') continue
      const ev = events.find((e) => String(e.id) === key)
      if (!ev || ev.start + 5 * 60_000 < now) {
        next[key] = 'fired'
        changed = true
        continue
      }
      if (now >= ev.start - REMIND_BEFORE_MS) {
        next[key] = 'fired'
        changed = true
        const body = [timeFmt.format(new Date(ev.start)), ev.venue].filter(Boolean).join(' · ')
        void showNotification(`${t(locale, 'tracker.notifTitle')}: ${ev.title}`, body, `sabantuy-event-${ev.id}`)
      }
    }
    if (changed) {
      setReminders(next)
      saveReminders(next)
    }
  }, [now, events, locale])

  const toggleReminder = async (ev: TrackerEvent) => {
    const key = String(ev.id)
    if (reminders[key] === 'pending') {
      const next = { ...reminders }
      delete next[key]
      setReminders(next)
      saveReminders(next)
      return
    }
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setNotifDenied(true)
        return
      }
    }
    const next: ReminderState = { ...reminders, [key]: 'pending' }
    setReminders(next)
    saveReminders(next)
  }

  // Кнопка видна только когда праздник идёт или на носу.
  const visible =
    now !== null &&
    (liveItems.length > 0 || (nextStart !== null && nextStart - now <= SHOW_BEFORE_MS))

  if (!visible) return null

  const fabLabel =
    liveItems.length > 0
      ? `${t(locale, 'tracker.fabNow')}${liveItems.length > 1 ? ` · ${liveItems.length}` : ''}`
      : nextStart !== null
        ? `⏱ ${fmtDelta(nextStart - now!, locale)}`
        : ''

  const card = (ev: TrackerEvent, live: boolean) => {
    const href = ev.slug ? localeHref(locale, `/events/${encodeURIComponent(ev.slug)}`) : null
    const end = ev.end ?? ev.start + NO_END_GRACE_MS
    const remindOn = reminders[String(ev.id)] === 'pending'
    return (
      <div className={`tracker-item${live ? ' is-live' : ''}`} key={ev.id}>
        <div className="tracker-item-time">
          {live ? (
            <>
              <span className="tracker-live-dot" aria-hidden="true" />
              {timeFmt.format(new Date(ev.start))}–{timeFmt.format(new Date(end))}
            </>
          ) : (
            <>
              {timeFmt.format(new Date(ev.start))}
              <span className="tracker-item-delta">{fmtDelta(ev.start - now!, locale)}</span>
            </>
          )}
        </div>
        <div className="tracker-item-body">
          <span className="tracker-item-title">{href ? <Link href={href} onClick={() => setOpen(false)}>{ev.title}</Link> : ev.title}</span>
          {(ev.venue || ev.location) && (
            <span className="tracker-item-place">📍 {[ev.venue, ev.location].filter(Boolean).join(' · ')}</span>
          )}
          {!live && (
            <span className="tracker-item-actions">
              <button
                type="button"
                className={`tracker-mini-btn${remindOn ? ' on' : ''}`}
                onClick={() => toggleReminder(ev)}
                aria-pressed={remindOn}
              >
                {remindOn ? t(locale, 'tracker.remindSet') : t(locale, 'tracker.remindPush')}
              </button>
              <button type="button" className="tracker-mini-btn" onClick={() => downloadIcs(ev, locale)}>
                {t(locale, 'tracker.remindIcs')}
              </button>
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        className={`tracker-fab${liveItems.length > 0 ? ' is-live' : ''}`}
        onClick={() => setOpen(true)}
        aria-label={t(locale, 'tracker.fabAria')}
      >
        <span className="tracker-fab-dot" aria-hidden="true" />
        {fabLabel}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t(locale, 'tracker.title')}>
        <div className="tracker-panel">
          {liveItems.length > 0 && (
            <section className="tracker-section">
              <h3 className="tracker-heading live">● {t(locale, 'tracker.nowHeading')}</h3>
              {liveItems.map((ev) => card(ev, true))}
            </section>
          )}
          {nextItems.length > 0 && nextStart !== null && (
            <section className="tracker-section">
              <h3 className="tracker-heading">{t(locale, 'tracker.nextHeading')}</h3>
              <p className="tracker-countdown" aria-live="polite">
                {fmtDelta(nextStart - now!, locale, true)}
              </p>
              {nextItems.map((ev) => card(ev, false))}
            </section>
          )}
          {liveItems.length === 0 && nextItems.length === 0 && (
            <p className="tracker-empty">{t(locale, 'tracker.empty')}</p>
          )}
          {nextItems.length > 0 && (
            <p className="tracker-hint">
              {notifDenied ? t(locale, 'tracker.notifDenied') : t(locale, 'tracker.remindHint')}
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}
