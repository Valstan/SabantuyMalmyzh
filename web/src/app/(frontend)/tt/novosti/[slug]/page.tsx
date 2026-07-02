import type { Metadata } from 'next'

import { NewsPostView, newsPostMeta } from '../../../_views/NewsPostView'

// Пост новостей — татарская версия. ISR.
export const revalidate = 60
export const dynamic = 'force-static'

type Args = { params: Promise<{ slug: string }> }

export default async function NewsPostPageTt({ params }: Args) {
  const { slug } = await params
  return <NewsPostView slug={slug} locale="tt" />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  return newsPostMeta(slug, 'tt')
}
