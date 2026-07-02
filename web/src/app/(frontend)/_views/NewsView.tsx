import type { Metadata } from 'next'

import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import { withRetry } from '../../../lib/withRetry'
import { NewsEditor } from '../components/edit/NewsEditor'
import { SectionHeading } from '../components/SectionHeading'

// Лента новостей праздника (ru: /novosti, tt: /tt/novosti) — блог-карточки:
// обложка + заголовок + дата + анонс. Тело поста — NewsPostView.
type MediaLike = { url?: string | null; alt?: string | null; sizes?: Record<string, { url?: string | null }> }

function cover(m: unknown): MediaLike | null {
  return m && typeof m === 'object' ? (m as MediaLike) : null
}

async function getPosts(locale: Locale) {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'news',
        where: { _status: { equals: 'published' } },
        sort: '-publishedAt',
        depth: 1,
        limit: 100,
        locale,
      })
      return res.docs
    })
  } catch {
    return null
  }
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }) : null

export async function NewsView({ locale }: { locale: Locale }) {
  const posts = await getPosts(locale)

  return (
    <main>
      <section className="section section--tint">
        <div className="section-inner">
          <SectionHeading eyebrow={t(locale, 'news.eyebrow')} title={t(locale, 'nav.news')} />
          <p className="section-lead">{t(locale, 'news.lead')}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <NewsEditor locale={locale} />
          {posts && posts.length > 0 ? (
            <div className="news-list">
              {posts.map((p) => {
                const img = cover(p.cover)
                const src = img?.sizes?.card?.url || img?.url || null
                return (
                  <Link className="news-card" href={localeHref(locale, `/novosti/${p.slug}`)} key={p.id}>
                    {src && (
                      <div className="news-card-img">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={img?.alt || p.title} loading="lazy" />
                      </div>
                    )}
                    <div className="news-card-body">
                      <h2>{p.title}</h2>
                      {fmtDate(p.publishedAt) && <p className="meta">{fmtDate(p.publishedAt)}</p>}
                      {p.excerpt && <p className="news-card-excerpt">{p.excerpt}</p>}
                      <span className="news-card-more">{t(locale, 'news.readMore')} →</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="placeholder">{t(locale, 'news.empty')}</div>
          )}
        </div>
      </section>
    </main>
  )
}

export const newsMeta = (locale: Locale): Metadata => ({
  title: `${t(locale, 'nav.news')} — Сабантуй в Малмыже`,
  description: t(locale, 'news.lead'),
})
