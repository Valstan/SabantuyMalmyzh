import Link from 'next/link'
import React from 'react'

import type { Feature } from '../../../lib/sabantuyFeatures'
import { MotifIcon } from './MotifIcon'

/**
 * Карточка-хайлайт «что вас ждёт». Если задан href — вся карточка ссылка.
 */
export function FeatureCard({ icon, title, text, href }: Feature) {
  const inner = (
    <>
      <span className="feature-icon">
        <MotifIcon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </>
  )
  if (href) {
    return (
      <Link className="feature-card" href={href}>
        {inner}
      </Link>
    )
  }
  return <div className="feature-card">{inner}</div>
}
