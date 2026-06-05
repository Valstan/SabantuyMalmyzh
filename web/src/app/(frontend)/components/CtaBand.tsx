import Link from 'next/link'
import React from 'react'

import { SectionDivider } from './SectionDivider'

/**
 * Финальная праздничная CTA-полоса (малина→бордо) с золотым орнаментом сверху.
 * Закрывает страницу призывом и ведёт в контакты / о фестивале.
 */
export function CtaBand({
  eyebrow,
  title,
  text,
  primary,
  secondary,
}: {
  eyebrow?: string
  title: string
  text: string
  primary: { href: string; label: string }
  secondary?: { href: string; label: string }
}) {
  return (
    <section className="section section--crimson">
      <div className="section-inner">
        <div className="cta-band">
          <SectionDivider variant="vine" />
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
          <p>{text}</p>
          <div className="cta-actions">
            <Link className="btn btn-gold" href={primary.href}>
              {primary.label}
            </Link>
            {secondary && (
              <Link className="btn btn-ghost" href={secondary.href}>
                {secondary.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
