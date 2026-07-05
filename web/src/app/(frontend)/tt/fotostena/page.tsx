import type { Metadata } from 'next'

import { FotostenaView, fotostenaMeta } from '../../_views/FotostenaView'

// Фотостена — татарская версия. ISR.
export const revalidate = 300

export const metadata: Metadata = fotostenaMeta('tt')

export default function FotostenaTtPage() {
  return <FotostenaView locale="tt" />
}
