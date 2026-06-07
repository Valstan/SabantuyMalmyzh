import type { Metadata } from 'next'

import { MapView, mapMeta } from '../../_views/MapView'

// tt-зеркало карты (I11).
export const revalidate = 60

export default function TtMapPage() {
  return <MapView locale="tt" />
}

export function generateMetadata(): Metadata {
  return mapMeta('tt')
}
