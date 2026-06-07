'use client'

import { useEffect, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { getPollOptions, pollQuestion } from '../../../lib/pollOptions'

/**
 * Анонимный опрос «Любимое состязание». Итоги (initialTallies) считает сервер
 * (агрегат, ISR-кэш). Голос — POST /api/poll-votes (create=anyone). Один голос
 * на браузер — флаг в localStorage; на сервере дополнительно rate-limit по IP.
 * До монтирования показываем варианты как есть (localStorage читаем после).
 */
const KEY = 'sabantuy:poll-voted'

export function Poll({
  initialTallies,
  locale = 'ru',
}: {
  initialTallies: Record<string, number>
  locale?: Locale
}) {
  const [mounted, setMounted] = useState(false)
  const [voted, setVoted] = useState<string | null>(null)
  const [tallies, setTallies] = useState<Record<string, number>>(initialTallies)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY)
      if (v) setVoted(v)
    } catch {
      /* приватный режим — игнорируем */
    }
    setMounted(true)
  }, [])

  const options = getPollOptions(locale)
  const total = options.reduce((s, o) => s + (tallies[o.value] || 0), 0)

  async function vote(option: string) {
    if (busy || voted) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/poll-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option }),
      })
      if (!res.ok) {
        throw new Error(t(locale, 'poll.error'))
      }
      setTallies((t) => ({ ...t, [option]: (t[option] || 0) + 1 }))
      setVoted(option)
      try {
        localStorage.setItem(KEY, option)
      } catch {
        /* приватный режим — голос всё равно засчитан на сервере */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, 'form.netError'))
    } finally {
      setBusy(false)
    }
  }

  const showResults = mounted && voted !== null

  return (
    <div className="poll">
      <p className="poll-q">{pollQuestion(locale)}</p>

      {!showResults ? (
        <ul className="poll-options">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                className="poll-opt"
                disabled={busy || !mounted}
                onClick={() => vote(o.value)}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="poll-results">
            {options.map((o) => {
              const c = tallies[o.value] || 0
              const pct = total > 0 ? Math.round((c / total) * 100) : 0
              return (
                <li key={o.value} className={voted === o.value ? 'mine' : undefined}>
                  <div className="poll-result-head">
                    <span>
                      {o.label}
                      {voted === o.value ? ' ✓' : ''}
                    </span>
                    <span className="poll-pct">{pct}%</span>
                  </div>
                  <div className="poll-bar">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="poll-total">
            {t(locale, 'poll.voted')} {total} {t(locale, 'poll.votes')}
          </p>
        </>
      )}

      {error && <p className="poll-error">{error}</p>}
    </div>
  )
}
