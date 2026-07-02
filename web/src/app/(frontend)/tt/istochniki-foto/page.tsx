import type { Metadata } from 'next'

import { CreditsView, creditsMeta } from '../../_views/CreditsView'

// /tt/istochniki-foto — татарская версия «Источников фотографий».
export const metadata: Metadata = creditsMeta('tt')

export default function CreditsPageTt() {
  return <CreditsView locale="tt" />
}
