import type { Metadata } from 'next'

import config from '@payload-config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import { videoEmbedSrc } from '../../../lib/videoEmbed'
import { withRetry } from '../../../lib/withRetry'
import { ArticleLightbox } from '../components/ArticleLightbox'
import { NewsEditor } from '../components/edit/NewsEditor'
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

          {/* Обложка + тело — под единым лайтбоксом сайта (клик по фото →
              пролистывание/шаринг как в «Народной ленте» + переход в медиатеку). */}
          <ArticleLightbox locale={locale}>
            {coverSrc && (
              <figure className="news-post-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverSrc} alt={img?.alt || post.title} />
              </figure>
            )}

            <NewsEditor id={post.id} locale={locale} />

            <article className="page">
              <div className="page-prose">
                {post.body ? <RichText data={post.body} /> : <p className="meta">{t(locale, 'page.empty')}</p>}
              </div>
            </article>
          </ArticleLightbox>

          {Array.isArray(post.videos) && post.videos.length > 0 && (
            <div className="news-videos">
              {post.videos.map((v) => {
                const src = videoEmbedSrc(v.url)
                return (
                  <figure className="news-video" key={v.id || v.url}>
                    {v.title && <figcaption className="news-video-title">🎬 {v.title}</figcaption>}
                    {src ? (
                      <div className="efir-player">
                        <iframe
                          src={src}
                          title={v.title || t(locale, 'news.videoTitle')}
                          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                          allowFullScreen
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      // Не распознанная площадка — обычная ссылка, iframe не строим (анти-инъекция)
                      <a href={v.url} target="_blank" rel="noopener noreferrer">
                        {v.title || v.url}
                      </a>
                    )}
                  </figure>
                )
              })}
            </div>
          )}
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
