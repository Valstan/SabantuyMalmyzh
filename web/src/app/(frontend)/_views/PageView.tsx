import type { Metadata } from 'next'

import config from '@payload-config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { breadcrumbJsonLd, faqJsonLd } from '../../../lib/jsonLd'
import { localeHref } from '../../../lib/localeHref'
import { getPageDecor } from '../../../lib/pageDecor'
import { withRetry } from '../../../lib/withRetry'
import { JsonLd } from '../components/JsonLd'
import { SectionDivider } from '../components/SectionDivider'
import { PageEditor } from '../components/edit/PageEditor'

// Общее тело статической страницы (Pages по slug). Используют ru-маршрут [slug] и
// tt-маршрут tt/[slug]. Контент читаем с locale (tt → fallback ru).
// Транзиентный сбой БД → throw (после ретраев): ISR не закэширует ложный 404 на
// реально существующей странице, а отдаст прошлый кэш. null = страницы реально нет.
async function queryPageBySlug(slug: string, locale: Locale) {
  return withRetry(async () => {
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
  })
}

export async function PageView({ slug, locale }: { slug: string; locale: Locale }) {
  const decoded = decodeURIComponent(slug)
  const page = await queryPageBySlug(decoded, locale)
  if (!page) notFound()
  const decor = getPageDecor(decoded, locale)

  // Разметка: хлебные крошки (Главная → страница) + на /faq — выверенные Q&A
  // (FAQPage помогает Google-сниппету и цитированию в нейросетях).
  const selfPath = locale === 'tt' ? `/tt/${decoded}` : `/${decoded}`
  const jsonLd: Record<string, unknown>[] = [
    breadcrumbJsonLd([
      { name: t(locale, 'crumb.home'), path: locale === 'tt' ? '/tt' : '/' },
      { name: page.title, path: selfPath },
    ]),
  ]
  if (decoded === 'faq') jsonLd.push(faqJsonLd(locale))

  // Обложка из БД (heroImage, правится on-site) перекрывает статический декор.
  const heroMedia =
    page.heroImage && typeof page.heroImage === 'object'
      ? (page.heroImage as { url?: string | null; sizes?: Record<string, { url?: string | null } | undefined> })
      : null
  const heroImageUrl = heroMedia ? heroMedia.sizes?.wide?.url || heroMedia.url || null : null
  const heroImageSm = heroMedia ? heroMedia.sizes?.card?.url || heroImageUrl : null
  const showPhoto = Boolean(heroImageUrl) || Boolean(decor.photo)

  // Гибрид «фото-фон + SVG-эмблема поверх»: image-set webp/jpg, 2 размера через CSS-vars
  const photoStyle = heroImageUrl
    ? ({ '--hero-photo': `url("${heroImageUrl}")`, '--hero-photo-sm': `url("${heroImageSm}")` } as React.CSSProperties)
    : decor.photo
      ? ({
          '--hero-photo': `image-set(url(/decor/${decor.photo.base}-lg.webp) type("image/webp"), url(/decor/${decor.photo.base}-lg.jpg) type("image/jpeg"))`,
          '--hero-photo-sm': `image-set(url(/decor/${decor.photo.base}-960.webp) type("image/webp"), url(/decor/${decor.photo.base}-960.jpg) type("image/jpeg"))`,
        } as React.CSSProperties)
      : undefined

  return (
    <main>
      <JsonLd data={jsonLd} />
      {/* Контент-aware шапка: AI-фото-фон (если есть) + орнамент-слой; без фото —
          мотив-медальон по смыслу страницы. Рисованные SVG-сцены убраны. */}
      <header
        className={`page-hero page-hero--${decor.accent} pattern-petals${showPhoto ? ' page-hero--photo' : ''}`}
        style={photoStyle}
      >
        <div className="section-inner narrow">
          <Link className="breadcrumb" href={localeHref(locale, '/')}>
            ← {t(locale, 'notFound.home')}
          </Link>
          {!showPhoto && (
            <span className="page-hero-medallion page-hero-medallion--ornament" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/decor/decor-roundel.jpg" alt="" />
            </span>
          )}
          <p className="eyebrow">{decor.eyebrow}</p>
          <h1 className="heading-brush">{page.title}</h1>
        </div>
      </header>

      {/* On-site редактор страницы (виден редактору в режиме «Редактирование») */}
      <PageEditor id={page.id} title={page.title} locale={locale} />

      {/* Официальная афиша (если задана в pageDecor): вертикальный постер целиком. */}
      {decor.poster && (
        <section className="section">
          <div className="section-inner narrow">
            <figure className="page-poster">
              <picture>
                <source srcSet={`/afisha/${decor.poster.base}.webp`} type="image/webp" />
                <img src={`/afisha/${decor.poster.base}.jpg`} alt={decor.poster.alt[locale]} loading="lazy" />
              </picture>
            </figure>
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-inner narrow">
          <article className="page">
            <div className="page-prose">
              {page.content ? <RichText data={page.content} /> : <p className="meta">{t(locale, 'page.empty')}</p>}
            </div>
          </article>
        </div>
      </section>

      <SectionDivider variant="ornament" />
    </main>
  )
}

export async function pageMeta(slug: string, locale: Locale): Promise<Metadata> {
  const decoded = decodeURIComponent(slug)
  const page = await queryPageBySlug(decoded, locale)
  return {
    title: page?.title ?? t(locale, 'notFound.title'),
    alternates: {
      canonical: locale === 'tt' ? `/tt/${decoded}` : `/${decoded}`,
      languages: { 'ru-RU': `/${decoded}`, 'tt-RU': `/tt/${decoded}` },
    },
  }
}
