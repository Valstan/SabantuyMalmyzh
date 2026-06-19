import React from 'react'

import { getFeatures } from '../../../lib/sabantuyFeatures'
import type { Locale } from '../../../lib/i18n'
import { FeatureCard } from './FeatureCard'

/** Ряд фича-карточек праздника с фото-обложками (3 → 2 по ширине). Локализован (I11).
 *  `overrides` — текст title/text из глобала home по ключу карточки (on-site PR3);
 *  иконка/обложка остаются из кода. */
export function FeatureRow({
  locale = 'ru',
  overrides,
}: {
  locale?: Locale
  overrides?: Record<string, { title?: string | null; text?: string | null }>
}) {
  return (
    <div className="feature-row feature-row--cover">
      {getFeatures(locale).map((f) => {
        const o = overrides?.[f.key]
        const { key: _key, ...rest } = f
        return <FeatureCard key={f.key} {...rest} title={o?.title || f.title} text={o?.text || f.text} coverLayout />
      })}
    </div>
  )
}
