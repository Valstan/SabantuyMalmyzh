import type { Metadata } from 'next'

import config from '@payload-config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { CATEGORY_LABELS } from '../../../../lib/categories'
import { isCompetitionCategory } from '../../../../lib/competitions'
import { FestivalNotice } from '../../components/FestivalNotice'
import { RegistrationForm } from './RegistrationForm'

// ISR: детали события кэшируются, фоновая ревалидация + on-demand (revalidateEvent).
// Безопасно: серверный gate (enforceRegistrationOpen) отклонит заявку, даже если
// кэш ещё показывает форму после закрытия регистрации.
export const revalidate = 60

const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

type Args = { params: Promise<{ slug: string }> }

async function queryEventBySlug(slug: string) {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'events',
      where: {
        and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
      },
      limit: 1,
      pagination: false,
      depth: 1,
    })
    return res.docs[0] ?? null
  } catch {
    return null
  }
}

export default async function EventPage({ params }: Args) {
  const { slug } = await params
  const event = await queryEventBySlug(decodeURIComponent(slug))

  if (!event) notFound()

  const hero = typeof event.heroImage === 'object' && event.heroImage !== null ? event.heroImage : null

  return (
    <main>
      <section className="section">
        <div className="section-inner narrow">
          <p style={{ marginBottom: '1rem' }}>
            <Link className="breadcrumb" href="/">
              ← Расписание
            </Link>
          </p>

          <FestivalNotice />

          <article className="event-detail">
        {hero?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="event-hero" src={hero.url} alt={hero.alt || event.title} />
        ) : (
          <div className="event-hero event-hero-fallback" aria-hidden="true">
            <span>Сабантуй&nbsp;Малмыж</span>
          </div>
        )}

        <h1>{event.title}</h1>

        <p className="event-facts">
          {event.startDate && <time>{dateFmt.format(new Date(event.startDate))}</time>}
          {event.category && <span className="badge">{CATEGORY_LABELS[event.category] ?? event.category}</span>}
        </p>

        {event.location && <p className="meta">📍 {event.location}</p>}
        {event.summary && <p className="event-summary">{event.summary}</p>}

        {event.content && (
          <div className="event-content">
            <RichText data={event.content} />
          </div>
        )}
      </article>

      <section id="register" className="register-section">
        <h2>{isCompetitionCategory(event.category) ? 'Заявка на состязание' : 'Регистрация участников'}</h2>
        {event.registrationEnabled ? (
          <RegistrationForm
            eventId={event.id}
            eventTitle={event.title}
            competitionMode={isCompetitionCategory(event.category)}
          />
        ) : (
          <div className="placeholder">Регистрация на это мероприятие пока не открыта.</div>
        )}
          </section>
        </div>
      </section>
    </main>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const event = await queryEventBySlug(decodeURIComponent(slug))
  return { title: event?.title ?? 'Событие не найдено' }
}
