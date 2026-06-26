import type { Metadata } from 'next'

import { AlbumView, albumMeta } from '../../_views/AlbumView'

// Альбом галереи. Тело — _views/AlbumView (ru/tt). ISR.
export const revalidate = 60
// probe 2026-06-26: force-static → ISR-кэш (иначе альбом рендерится на каждый хит,
// no-store; CI билд против пустой БД делает generateStaticParams бесполезным).
export const dynamic = 'force-static'

type Args = { params: Promise<{ slug: string }> }

export default async function AlbumPage({ params }: Args) {
  const { slug } = await params
  return <AlbumView slug={slug} locale="ru" />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  return albumMeta(slug, 'ru')
}
