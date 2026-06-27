import type { Metadata } from 'next'

import { EfirView, efirMeta } from '../../_views/EfirView'

// /tt/efir — татарская версия страницы прямого эфира. См. /efir.
export const revalidate = 30

export const metadata: Metadata = efirMeta('tt')

export default function EfirPageTt() {
  return <EfirView locale="tt" />
}
