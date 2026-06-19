import type { Metadata } from 'next'

import { GamesHubView, gamesHubMeta } from '../../_views/GamesHubView'

// tt-зеркало хаба-выбора игр (I11).
export const revalidate = 60

export default function TtGamesHubPage() {
  return <GamesHubView locale="tt" />
}

export function generateMetadata(): Metadata {
  return gamesHubMeta('tt')
}
