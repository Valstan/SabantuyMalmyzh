import type { Metadata } from 'next'

import { EventView, eventMeta } from '../../_views/EventView'

// Страница события. Тело — _views/EventView (ru/tt). ISR + серверный gate регистрации.
export const revalidate = 60
// probe 2026-06-26: force-static → ISR-кэш. Регистрация всё равно гейтится сервером
// на POST (enforceRegistrationOpen), 60с-staleness UI безопасна. CI билд против пустой
// БД → generateStaticParams бесполезен.
export const dynamic = 'force-static'

type Args = { params: Promise<{ slug: string }> }

export default async function EventPage({ params }: Args) {
  const { slug } = await params
  return <EventView slug={slug} locale="ru" />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  return eventMeta(slug, 'ru')
}
