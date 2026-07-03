import type { Metadata } from 'next'

import { MediatekaView, mediatekaMeta } from '../../_views/MediatekaView'

// Медиатека — татарская версия. ISR.
export const revalidate = 300

export const metadata: Metadata = mediatekaMeta('tt')

export default function MediatekaTtPage() {
  return <MediatekaView locale="tt" />
}
