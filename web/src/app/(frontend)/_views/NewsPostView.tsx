import type { Metadata } from 'next'

import config from '@payload-config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import { withRetry } from '../../../lib/withRetry'
import { SectionHeading } from '../components/SectionHeading'

// Пост новостей (ru: /novosti/[slug], tt: /tt/novosti/[slug]).
type MediaLike = { url?: string | null; alt?: string | null; sizes?: Record<string, { url?: string | null }> }

// Транзиентный сбой БД → throw (после ретраев): ISR не закэширует ложный 404
// (паттерн AlbumView). null = поста реально нет.
async function queryPost(slug: string, locale: Locale) {
  return withRetry(async () => {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'news',
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
      limit: 1,
      pagination: false,
      depth: 1,
      locale,
    })
    return res.docs[0] ?? null
  })
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }) : null

export async function NewsPostView({ slug, locale }: { slug: string; locale: Locale }) {
  const post = await queryPost(decodeURIComponent(slug), locale)
  if (!post) notFound()

  const img = post.cover && typeof post.cover === 'object' ? (post.cover as MediaLike) : null
  const coverSrc = img?.sizes?.wide?.url || img?.url || null

  return (
    <main>
      <section className="section">
        <div className="section-inner">
          <p style={{ marginBottom: '1rem' }}>
            <Link className="breadcrumb" href={localeHref(locale, '/novosti')}>
              ← {t(locale, 'nav.news')}
            </Link>
          </p>
          <SectionHeading eyebrow={t(locale, 'news.eyebrow')} title={post.title} />
          {fmtDate(post.publishedAt) && <p className="meta">{fmtDate(post.publishedAt)}</p>}

          {coverSrc && (
            <figure className="news-post-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverSrc} alt={img?.alt || post.title} />
            </figure>
          )}

          <article className="page">
            <div className="page-prose">
              {post.body ? <RichText data={post.body} /> : <p className="meta">{t(locale, 'page.empty')}</p>}
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}

export async function newsPostMeta(slug: string, locale: Locale): Promise<Metadata> {
  const post = await queryPost(decodeURIComponent(slug), locale)
  return {
    title: post ? `${post.title} — ${t(locale, 'nav.news')}` : t(locale, 'notFound.title'),
    description: post?.excerpt || undefined,
  }
}
