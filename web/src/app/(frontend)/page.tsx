import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

// ISR: страница кэшируется и фоново ревалидируется (живучесть в пик нагрузки).
// On-demand обновление при изменении события — хук revalidateEvent. При сборке
// без БД getPublishedEvents отдаёт пустое состояние (try/catch) — build не падает.
export const revalidate = 60

const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

async function getPublishedEvents() {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'events',
      where: { _status: { equals: 'published' } },
      sort: 'startDate',
      depth: 0,
      limit: 100,
    })
    return res.docs
  } catch {
    // Нет БД / схема ещё не накатана — отдаём пустое состояние, страница не падает.
    return null
  }
}

export default async function HomePage() {
  const events = await getPublishedEvents()

  return (
    <main className="container">
      <section className="hero">
        <h1>Сабантуй&nbsp;Малмыж</h1>
        <p>Расписание мероприятий, галерея и регистрация участников фестиваля.</p>
      </section>

      <section>
        <h2>Расписание</h2>
        {events && events.length > 0 ? (
          events.map((event) => {
            const href = event.slug ? `/events/${encodeURIComponent(event.slug)}` : undefined
            return (
              <article className="schedule-item" key={event.id}>
                {event.startDate && <time>{dateFmt.format(new Date(event.startDate))}</time>}
                <h3>{href ? <Link href={href}>{event.title}</Link> : event.title}</h3>
                {event.summary && <p>{event.summary}</p>}
                {event.location && <p className="meta">📍 {event.location}</p>}
                {event.registrationEnabled && href && (
                  <Link className="reg-badge" href={`${href}#register`}>
                    Запись открыта →
                  </Link>
                )}
              </article>
            )
          })
        ) : (
          <div className="placeholder">
            Расписание пока не опубликовано. Организаторы добавляют события в{' '}
            <Link href="/admin" prefetch={false}>
              админке
            </Link>
            .
          </div>
        )}
      </section>
    </main>
  )
}
