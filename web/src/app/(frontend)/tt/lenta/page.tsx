import type { Metadata } from 'next'

import { LentaView, lentaMeta } from '../../_views/LentaView'

// /tt/lenta — татарская версия «Народной ленты». См. /lenta.
export const dynamic = 'force-static'
export const revalidate = 30

export const metadata: Metadata = lentaMeta('tt')

export default function LentaPageTt() {
  return <LentaView locale="tt" />
}
