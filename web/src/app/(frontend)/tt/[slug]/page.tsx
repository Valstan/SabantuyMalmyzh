import type { Metadata } from 'next'

import { PageView, pageMeta } from '../../_views/PageView'

// tt-зеркало статической страницы (I11).
export const revalidate = 60
// probe 2026-06-26: force-static → ISR-кэш (иначе [slug] рендерится на каждый хит,
// no-store; CI билд против пустой БД делает generateStaticParams бесполезным).
export const dynamic = 'force-static'

type Args = { params: Promise<{ slug: string }> }

export default async function TtPageBySlug({ params }: Args) {
  const { slug } = await params
  return <PageView slug={slug} locale="tt" />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  return pageMeta(slug, 'tt')
}
