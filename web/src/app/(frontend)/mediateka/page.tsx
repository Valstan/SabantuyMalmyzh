import type { Metadata } from 'next'

import { MediatekaView, mediatekaMeta } from '../_views/MediatekaView'

// Медиатека сайта — все залитые фото одной сеткой. ISR.
export const revalidate = 300

export const metadata: Metadata = mediatekaMeta('ru')

export default function MediatekaPage() {
  return <MediatekaView locale="ru" />
}
