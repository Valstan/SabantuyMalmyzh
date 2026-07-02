import type { Metadata } from 'next'

import { NewsView, newsMeta } from '../../_views/NewsView'

// Яңалыклар — татарская версия ленты новостей. ISR.
export const revalidate = 60

export const metadata: Metadata = newsMeta('tt')

export default function NewsPageTt() {
  return <NewsView locale="tt" />
}
