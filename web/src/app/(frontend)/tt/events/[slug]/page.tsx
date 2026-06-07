import type { Metadata } from 'next'

import { EventView, eventMeta } from '../../../_views/EventView'

// tt-зеркало страницы события (I11).
export const revalidate = 60

type Args = { params: Promise<{ slug: string }> }

export default async function TtEventPage({ params }: Args) {
  const { slug } = await params
  return <EventView slug={slug} locale="tt" />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  return eventMeta(slug, 'tt')
}
