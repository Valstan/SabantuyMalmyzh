import React from 'react'

import { SABANTUY_FEATURES } from '../../../lib/sabantuyFeatures'
import { FeatureCard } from './FeatureCard'

/** Адаптивный ряд фича-карточек праздника (6 → 3 → 2 по ширине). */
export function FeatureRow() {
  return (
    <div className="feature-row">
      {SABANTUY_FEATURES.map((f) => (
        <FeatureCard key={f.title} {...f} />
      ))}
    </div>
  )
}
