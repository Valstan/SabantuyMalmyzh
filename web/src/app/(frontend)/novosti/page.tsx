import type { Metadata } from 'next'

import { NewsView, newsMeta } from '../_views/NewsView'

// Новости праздника — блог-лента. Тело — _views/NewsView (ru/tt). ISR.
export const revalidate = 60

export const metadata: Metadata = newsMeta('ru')

export default function NewsPage() {
  return <NewsView locale="ru" />
}
