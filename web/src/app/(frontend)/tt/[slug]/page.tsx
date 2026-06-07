import type { Metadata } from 'next'

import { PageView, pageMeta } from '../../_views/PageView'

// tt-зеркало статической страницы (I11).
export const revalidate = 60

type Args = { params: Promise<{ slug: string }> }

export default async function TtPageBySlug({ params }: Args) {
  const { slug } = await params
  return <PageView slug={slug} locale="tt" />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  return pageMeta(slug, 'tt')
}
