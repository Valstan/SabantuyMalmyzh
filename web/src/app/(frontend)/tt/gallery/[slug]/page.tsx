import type { Metadata } from 'next'

import { AlbumView, albumMeta } from '../../../_views/AlbumView'

// tt-зеркало альбома (I11).
export const revalidate = 60

type Args = { params: Promise<{ slug: string }> }

export default async function TtAlbumPage({ params }: Args) {
  const { slug } = await params
  return <AlbumView slug={slug} locale="tt" />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  return albumMeta(slug, 'tt')
}
