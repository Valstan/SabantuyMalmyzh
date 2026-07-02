import type { Metadata } from 'next'

import config from '@payload-config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import { withRetry } from '../../../lib/withRetry'
import { categoryLabel } from '../../../lib/categories'
import { isCompetitionCategory } from '../../../lib/competitions'
import { EVENT_MEDIA } from '../../../lib/eventMedia'
import { FestivalNotice } from '../components/FestivalNotice'
import { EventEditor } from '../components/edit/EventEditor'
import { RegistrationForm } from '../events/[slug]/RegistrationForm'

// Общее тело страницы события (ru: /events/[slug], tt: /tt/events/[slug]).
// title/summary/location/venue/content — с locale (tt → fallback ru).
const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

// Транзиентный сбой БД → throw (после ретраев): ISR не закэширует ложный 404 на
// реально существующем событии, а отдаст прошлый кэш. null = события реально нет.
async function queryEventBySlug(slug: string, locale: Locale) {
  return withRetry(async () => {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'events',
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
      limit: 1,
      pagination: false,
      depth: 1,
      locale,
    })
    return res.docs[0] ?? null
  })
}

export async function EventView({ slug, locale }: { slug: string; locale: Locale }) {
  const event = await queryEventBySlug(decodeURIComponent(slug), locale)
  if (!event) notFound()

  const hero = typeof event.heroImage === 'object' && event.heroImage !== null ? event.heroImage : null
  // Кодовые медиа (шапка/галерея) для событий без heroImage в БД — lib/eventMedia.ts
  const media = event.slug ? EVENT_MEDIA[event.slug] : undefined
  const heroSrc = hero?.url || media?.hero?.src || null
  const heroAlt = hero?.url ? hero.alt || event.title : media?.hero?.alt || event.title
  const isComp = isCompetitionCategory(event.category)

  return (
    <main>
      <section className="section">
        <div className="section-inner narrow">
          <p style={{ marginBottom: '1rem' }}>
            <Link className="breadcrumb" href={localeHref(locale, '/')}>
              ← {t(locale, 'nav.schedule')}
            </Link>
          </p>

          <EventEditor id={event.id} title={event.title} locale={locale} />

          <FestivalNotice locale={locale} />

          <article className="event-detail">
            {heroSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="event-hero" src={heroSrc} alt={heroAlt} />
            ) : (
              <div className="event-hero event-hero-fallback" aria-hidden="true">
                <span>Сабантуй&nbsp;Малмыж</span>
              </div>
            )}

            <h1>{event.title}</h1>

            <p className="event-facts">
              {event.startDate && <time>{dateFmt.format(new Date(event.startDate))}</time>}
              {event.category && <span className="badge">{categoryLabel(event.category, locale)}</span>}
            </p>

            {event.location && <p className="meta">📍 {event.location}</p>}
            {event.summary && <p className="event-summary">{event.summary}</p>}

            {event.content && (
              <div className="event-content">
                <RichText data={event.content} />
              </div>
            )}

            {media?.gallery && media.gallery.length > 0 && (
              <section className="event-gallery" aria-label={t(locale, 'event.photos')}>
                <h2>{t(locale, 'event.photos')}</h2>
                <div className="event-gallery-grid">
                  {media.gallery.map((p) => (
                    <a key={p.full} href={p.full} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.thumb} alt={p.alt} loading="lazy" />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </article>

          <section id="register" className="register-section">
            <h2>{isComp ? t(locale, 'reg.titleCompetition') : t(locale, 'reg.title')}</h2>
            {event.registrationEnabled ? (
              <RegistrationForm
                eventId={event.id}
                eventTitle={event.title}
                competitionMode={isComp}
                locale={locale}
              />
            ) : (
              <div className="placeholder">{t(locale, 'reg.closed')}</div>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

export async function eventMeta(slug: string, locale: Locale): Promise<Metadata> {
  const event = await queryEventBySlug(decodeURIComponent(slug), locale)
  return { title: event?.title ?? t(locale, 'notFound.title') }
}
