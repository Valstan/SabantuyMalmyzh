import React from 'react'

/**
 * Полноширинный орнаментальный разделитель между секциями / на стыке цветных
 * баннеров. variant 'wave'|'drape' заливают цветом соседней секции (создают
 * вырез); 'vine' — золотой декоративный медальон по центру. aria-hidden.
 */
type Variant = 'wave' | 'drape' | 'vine'

const FILL_PATHS: Record<'wave' | 'drape', string> = {
  // Плавная волна
  wave: 'M0,38 C200,8 420,8 600,28 C800,50 1000,52 1200,20 L1200,60 L0,60 Z',
  // Фестонная драпировка (ткань)
  drape:
    'M0,16 Q75,52 150,16 T300,16 T450,16 T600,16 T750,16 T900,16 T1050,16 T1200,16 L1200,60 L0,60 Z',
}

export function SectionDivider({
  variant = 'wave',
  flip = false,
  color = 'var(--brand-sand)',
}: {
  variant?: Variant
  flip?: boolean
  color?: string
}) {
  if (variant === 'vine') {
    return (
      <div className="ornament-divider" aria-hidden="true">
        <svg viewBox="0 0 240 40" fill="none" stroke="var(--c-gold)" strokeWidth={2}>
          <path d="M30 20h70" strokeLinecap="round" />
          <path d="M210 20h-70" strokeLinecap="round" />
          <path d="M100 20q6-7 14-7 8 0 14 7" strokeLinecap="round" />
          <path d="M86 20q-7-6-14-3M154 20q7-6 14-3" strokeLinecap="round" />
          <path
            d="M120 9c-3 0-4.5 3-4 5.5 1.4-1.6 2.6-1.6 4-.3 1.4-1.3 2.6-1.3 4 .3.5-2.5-1-5.5-4-5.5Z"
            fill="var(--c-gold)"
            stroke="none"
          />
        </svg>
      </div>
    )
  }
  return (
    <div className="ornament-divider" aria-hidden="true">
      <svg
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        style={flip ? { transform: 'scaleY(-1)' } : undefined}
      >
        <path d={FILL_PATHS[variant]} fill={color} />
      </svg>
    </div>
  )
}
