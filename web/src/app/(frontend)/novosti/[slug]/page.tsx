import type { Metadata } from 'next'

import { NewsPostView, newsPostMeta } from '../../_views/NewsPostView'

// Пост новостей. Тело — _views/NewsPostView (ru/tt). ISR.
export const revalidate = 60
// force-static → ISR-кэш (паттерн gallery/[slug], probe 2026-06-26).
export const dynamic = 'force-static'

type Args = { params: Promise<{ slug: string }> }

export default async function NewsPostPage({ params }: Args) {
  const { slug } = await params
  return <NewsPostView slug={slug} locale="ru" />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  return newsPostMeta(slug, 'ru')
}
