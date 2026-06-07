import type { Metadata } from 'next'

import { GalleryView, galleryMeta } from '../../_views/GalleryView'

// tt-зеркало галереи-индекса (I11).
export const revalidate = 60

export const metadata: Metadata = galleryMeta('tt')

export default function TtGalleryPage() {
  return <GalleryView locale="tt" />
}
