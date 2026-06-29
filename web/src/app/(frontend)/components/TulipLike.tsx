import React from 'react'

/**
 * Иконка лайка — тюльпан (фирменный цветок Сабантуя, тот же мотив, что в логотипе/
 * заголовках, `--motif-tulip`). Заменяет сердце.
 *   filled=false → контур (currentColor) — ещё не лайкнуто;
 *   filled=true  → залитый красный тюльпан (#c8203f лепестки + #7a1228 сердцевина) —
 *                  лайкнуто, как цветок логотипа.
 * viewBox 0 0 20 20 — path 1-в-1 из `--motif-tulip` (patterns.css).
 */
const BLOOM = 'M10 18 C 4 16 2 9 3 4 C 5 7 7 7 9 5 L 10 3 L 11 5 C 13 7 15 7 17 4 C 18 9 16 16 10 18 Z'

export function TulipLike({ filled, size = 18 }: { filled: boolean; size?: number }) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d={BLOOM} fill="#c8203f" />
        <path d="M9 5 C 9 9 9 14 10 18 C 11 14 11 9 11 5 Z" fill="#7a1228" />
      </svg>
    )
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={BLOOM} />
      <path d="M10 6 V 18" />
    </svg>
  )
}
