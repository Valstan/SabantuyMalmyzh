import type { Metadata } from 'next'

import { FotobitvaStatsView, fotobitvaMeta } from '../../../_views/FotobitvaStatsView'

// /tt/lenta/fotobitva — татарская версия статистики «Фотобитвы». См. lenta/fotobitva.
export const dynamic = 'force-static'
export const revalidate = 60

export const metadata: Metadata = fotobitvaMeta('tt')

export default function FotobitvaPageTt() {
  return <FotobitvaStatsView locale="tt" />
}
