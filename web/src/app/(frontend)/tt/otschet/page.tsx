import type { Metadata } from 'next'

import { OtschetView, otschetMeta } from '../../_views/OtschetView'

// «Сабантуйга күпме калды» — татарская версия страницы отсчёта. ISR.
export const revalidate = 300

export const metadata: Metadata = otschetMeta('tt')

export default function OtschetTtPage() {
  return <OtschetView locale="tt" />
}
