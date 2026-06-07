import React from 'react'

import { getFeatures } from '../../../lib/sabantuyFeatures'
import type { Locale } from '../../../lib/i18n'
import { FeatureCard } from './FeatureCard'

/** Адаптивный ряд фича-карточек праздника (6 → 3 → 2 по ширине). Локализован (I11). */
export function FeatureRow({ locale = 'ru' }: { locale?: Locale }) {
  return (
    <div className="feature-row">
      {getFeatures(locale).map((f) => (
        <FeatureCard key={f.title} {...f} />
      ))}
    </div>
  )
}
