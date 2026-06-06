import React from 'react'

/**
 * D1 «лепестки праздничности» — тюльпан-лепестки, медленно дрейфующие над героем.
 * Чистый CSS-декор: серверный компонент, без JS/гидрации. Слой `aria-hidden`,
 * `pointer-events:none`, лежит над вуалью и под текстом героя.
 * Полностью гаснет под `prefers-reduced-motion` (festive.css → display:none).
 *
 * Конфиги детерминированы (без Math.random — стабильный SSR/гидрация). Часть
 * лепестков стартует с отрицательной задержкой → сразу видны в полёте, не «сыплются с нуля».
 */
const PETALS: { left: number; size: number; delay: number; dur: number; hue: 'gold' | 'crimson' }[] = [
  { left: 5, size: 16, delay: -3, dur: 15, hue: 'gold' },
  { left: 14, size: 22, delay: -9, dur: 19, hue: 'gold' },
  { left: 23, size: 13, delay: -1, dur: 14, hue: 'crimson' },
  { left: 34, size: 19, delay: -12, dur: 17, hue: 'gold' },
  { left: 45, size: 15, delay: -6, dur: 21, hue: 'gold' },
  { left: 55, size: 24, delay: -15, dur: 18, hue: 'crimson' },
  { left: 64, size: 14, delay: -4, dur: 16, hue: 'gold' },
  { left: 73, size: 20, delay: -11, dur: 20, hue: 'gold' },
  { left: 82, size: 12, delay: -7, dur: 13, hue: 'crimson' },
  { left: 90, size: 18, delay: -2, dur: 18, hue: 'gold' },
  { left: 96, size: 15, delay: -13, dur: 22, hue: 'gold' },
]

export function Petals() {
  return (
    <div className="hero-petals" aria-hidden="true">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className={`petal petal--${p.hue} ${i % 2 === 0 ? 'petal--sway-a' : 'petal--sway-b'}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1.5C7 7 6.5 14.5 12 22.5 17.5 14.5 17 7 12 1.5Z" />
          </svg>
        </span>
      ))}
    </div>
  )
}
