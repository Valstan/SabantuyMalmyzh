import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { ScheduleList, type ScheduleItem } from './ScheduleList'

// ISR: страница кэшируется и фоново ревалидируется (живучесть в пик нагрузки).
// On-demand обновление при изменении события — хук revalidateEvent. При сборке
// без БД getPublishedEvents отдаёт пустое состояние (try/catch) — build не падает.
export const revalidate = 60

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
  const items: ScheduleItem[] = (events ?? []).map((e) => ({
    id: e.id,
    slug: e.slug ?? null,
    title: e.title,
    summary: e.summary ?? null,
    location: e.location ?? null,
    venue: e.venue ?? null,
    startDate: e.startDate ?? null,
    endDate: e.endDate ?? null,
    category: e.category ?? null,
    registrationEnabled: Boolean(e.registrationEnabled),
  }))

  return (
    <main className="container">
      <section className="hero">
        <h1>Сабантуй&nbsp;Малмыж</h1>
        <p>Расписание мероприятий, галерея и регистрация участников фестиваля.</p>
      </section>

      <section>
        <h2>Расписание</h2>
        {items.length > 0 ? (
          <ScheduleList items={items} />
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
