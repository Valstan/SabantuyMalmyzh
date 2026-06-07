import type { Metadata } from 'next'

import { GalleryView, galleryMeta } from '../_views/GalleryView'

// Галерея — список альбомов. Тело — _views/GalleryView (ru/tt). ISR.
export const revalidate = 60

export const metadata: Metadata = galleryMeta('ru')

export default function GalleryPage() {
  return <GalleryView locale="ru" />
}
