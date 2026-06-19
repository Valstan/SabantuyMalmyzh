import type { Metadata } from 'next'

import { GamesHubView, gamesHubMeta } from '../_views/GamesHubView'

// /igra — хаб-выбор игр (список). Конкретная игра играется на /igra/[game].
export const revalidate = 60

export default function GamesHubPage() {
  return <GamesHubView locale="ru" />
}

export function generateMetadata(): Metadata {
  return gamesHubMeta('ru')
}
