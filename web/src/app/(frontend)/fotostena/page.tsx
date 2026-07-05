import type { Metadata } from 'next'

import { FotostenaView, fotostenaMeta } from '../_views/FotostenaView'

// Фотостена — кадры гостей из VK (I8). ISR + on-demand ревалидация при модерации.
export const revalidate = 300

export const metadata: Metadata = fotostenaMeta('ru')

export default function FotostenaPage() {
  return <FotostenaView locale="ru" />
}
