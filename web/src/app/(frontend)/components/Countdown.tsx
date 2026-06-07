'use client'

import { useEffect, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'

const UNITS: Record<Locale, [string, string, string, string]> = {
  ru: ['дн.', 'ч.', 'мин.', 'сек.'],
  tt: ['көн', 'сәг.', 'мин.', 'сек.'],
}

/**
 * Обратный отсчёт до праздника. Цель (targetIso) приходит с сервера — дата
 * ближайшего события. Числа считаются на клиенте (тик раз в секунду), поэтому
 * не зависят от ISR-кэша. До монтирования рендерим «—», чтобы не ловить
 * hydration-mismatch. Праздник наступил/прошёл → компонент ничего не показывает.
 */
function split(ms: number) {
  let s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  s -= d * 86400
  const h = Math.floor(s / 3600)
  s -= h * 3600
  const m = Math.floor(s / 60)
  s -= m * 60
  return { d, h, m, s }
}

export function Countdown({ targetIso, locale = 'ru' }: { targetIso: string; locale?: Locale }) {
  const target = new Date(targetIso).getTime()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (Number.isNaN(target)) return null
  if (now !== null && target <= now) return null // праздник идёт/прошёл

  const rem = now === null ? null : split(target - now)
  const u = UNITS[locale]
  const cells: { v: number | null; label: string }[] = [
    { v: rem?.d ?? null, label: u[0] },
    { v: rem?.h ?? null, label: u[1] },
    { v: rem?.m ?? null, label: u[2] },
    { v: rem?.s ?? null, label: u[3] },
  ]

  return (
    <div className="countdown" role="timer" aria-label={t(locale, 'countdown.aria')}>
      {cells.map((c, i) => (
        <div className="countdown-cell" key={i}>
          <span className="countdown-num">
            {c.v === null ? '—' : String(c.v).padStart(2, '0')}
          </span>
          <span className="countdown-label">{c.label}</span>
        </div>
      ))}
    </div>
  )
}
