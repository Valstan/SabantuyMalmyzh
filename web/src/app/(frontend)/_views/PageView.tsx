import type { Metadata } from 'next'

import config from '@payload-config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import { getPageDecor } from '../../../lib/pageDecor'
import { MotifIcon } from '../components/MotifIcon'
import { SectionDivider } from '../components/SectionDivider'

// Общее тело статической страницы (Pages по slug). Используют ru-маршрут [slug] и
// tt-маршрут tt/[slug]. Контент читаем с locale (tt → fallback ru).
async function queryPageBySlug(slug: string, locale: Locale) {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
      locale,
      limit: 1,
      pagination: false,
      depth: 1,
    })
    return res.docs[0] ?? null
  } catch {
    return null
  }
}

export async function PageView({ slug, locale }: { slug: string; locale: Locale }) {
  const decoded = decodeURIComponent(slug)
  const page = await queryPageBySlug(decoded, locale)
  if (!page) notFound()
  const decor = getPageDecor(decoded, locale)

  return (
    <main>
      {/* Контент-aware декоративная шапка: мотив-медальон + орнамент-текстура */}
      <header className={`page-hero page-hero--${decor.accent} pattern-petals`}>
        <div className="section-inner narrow">
          <Link className="breadcrumb" href={localeHref(locale, '/')}>
            ← {t(locale, 'notFound.home')}
          </Link>
          <span className="page-hero-medallion" aria-hidden="true">
            <MotifIcon name={decor.icon} size={38} />
          </span>
          <p className="eyebrow">{decor.eyebrow}</p>
          <h1 className="heading-brush">{page.title}</h1>
        </div>
      </header>

      <section className="section">
        <div className="section-inner narrow">
          <article className="page">
            <div className="page-prose">
              {page.content ? <RichText data={page.content} /> : <p className="meta">{t(locale, 'page.empty')}</p>}
            </div>
          </article>
        </div>
      </section>

      <SectionDivider variant="vine" />
    </main>
  )
}

export async function pageMeta(slug: string, locale: Locale): Promise<Metadata> {
  const page = await queryPageBySlug(decodeURIComponent(slug), locale)
  return { title: page?.title ?? t(locale, 'notFound.title') }
}
