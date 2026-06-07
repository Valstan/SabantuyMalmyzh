import type { Metadata } from 'next'

import { MapView, mapMeta } from '../_views/MapView'

// ISR: карта меняется редко (revalidateFestivalMap). Тело — _views/MapView (ru/tt).
export const revalidate = 60

export default function MapPage() {
  return <MapView locale="ru" />
}

export function generateMetadata(): Metadata {
  return mapMeta('ru')
}
