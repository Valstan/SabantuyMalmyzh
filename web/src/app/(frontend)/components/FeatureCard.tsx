import Link from 'next/link'
import React from 'react'

import type { Feature } from '../../../lib/sabantuyFeatures'
import { MotifIcon } from './MotifIcon'

type FeatureCardProps = Feature & {
  /** Обложка-фото 4:3 в шапке карточки (slug в web/public/decor/, `<cover>-{480,768}.jpg`). */
  cover?: string
  /** Раскладка хаба «Традиции и культура»: фото-обложка сверху (или градиент-иконка, если нет фото). */
  coverLayout?: boolean
}

/**
 * Карточка-хайлайт. Два режима:
 *  · фича-ряд «что вас ждёт» — компактная иконка-кружок + заголовок + текст;
 *  · хаб культ-разделов (coverLayout) — обложка 4:3 сверху (фото или градиент-иконка) + текст.
 * Если задан href — вся карточка ссылка.
 */
export function FeatureCard({ icon, title, text, href, cover, coverLayout }: FeatureCardProps) {
  const inner = coverLayout ? (
    <>
      {cover ? (
        <span className="feature-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/decor/${cover}-768.jpg`}
            srcSet={`/decor/${cover}-480.jpg 480w, /decor/${cover}-768.jpg 768w`}
            sizes="(min-width: 900px) 350px, (min-width: 640px) 30vw, 50vw"
            alt=""
            loading="lazy"
          />
        </span>
      ) : (
        <span className="feature-cover feature-cover--icon" aria-hidden="true">
          <MotifIcon name={icon} size={48} />
        </span>
      )}
      <span className="feature-card-body">
        <h3>{title}</h3>
        <p>{text}</p>
      </span>
    </>
  ) : (
    <>
      <span className="feature-icon">
        <MotifIcon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </>
  )
  const className = coverLayout ? 'feature-card feature-card--cover' : 'feature-card'
  if (href) {
    return (
      <Link className={className} href={href}>
        {inner}
      </Link>
    )
  }
  return <div className={className}>{inner}</div>
}
