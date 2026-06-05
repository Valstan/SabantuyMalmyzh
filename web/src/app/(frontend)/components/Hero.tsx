import React from 'react'

import { SectionDivider } from './SectionDivider'

/**
 * Герой-«ворота» главной: полноэкранное реальное фото + бордо/изумруд оверлей +
 * ислими-вуаль + крупный титул + теглайн + CTA. Фолбэк-градиент при отсутствии
 * фото (пустая БД). Нижний резной разделитель «врезается» в следующую секцию.
 * <img> грузится eager/high — это LCP.
 */
export function Hero({
  imageUrl,
  imageAlt = 'Сабантуй в Малмыже',
  eyebrow,
  title,
  tagline,
  children,
  dividerColor = 'var(--section-tint-a)',
}: {
  imageUrl?: string | null
  imageAlt?: string
  eyebrow?: string
  title: React.ReactNode
  tagline?: string
  children?: React.ReactNode
  dividerColor?: string
}) {
  return (
    <section className="hero-festive">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="hero-bg"
          src={imageUrl}
          alt={imageAlt}
          fetchPriority="high"
          loading="eager"
        />
      ) : (
        <div className="hero-fallback" aria-hidden="true" />
      )}
      <div className="hero-veil" aria-hidden="true" />

      <div className="hero-content">
        {eyebrow && <p className="hero-eyebrow">{eyebrow}</p>}
        <h1 className="hero-title">{title}</h1>
        {tagline && <p className="hero-tagline">{tagline}</p>}
        {children && <div className="hero-cta">{children}</div>}
      </div>

      <div className="hero-divider">
        <SectionDivider variant="wave" color={dividerColor} />
      </div>
    </section>
  )
}
