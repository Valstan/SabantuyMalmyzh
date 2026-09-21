import type { Metadata } from 'next'

import { localeAlternates } from '../../../lib/localeAlternates'
import { SITE_DESC } from '../../../lib/site'
import { HomeView } from '../_views/HomeView'

// canonical /tt, не унаследованный '/' из layout (G312).
export const metadata: Metadata = {
  description: SITE_DESC,
  alternates: localeAlternates('tt', '/'),
}

// tt-зеркало главной (I11).
export const revalidate = 60

export default function TtHomePage() {
  return <HomeView locale="tt" />
}
