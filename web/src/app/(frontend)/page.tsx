import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { excerpt } from '../../lib/lexicalExcerpt'
import { mapTypeMeta } from '../../lib/mapTypes'
import { CtaBand } from './components/CtaBand'
import { FeatureRow } from './components/FeatureRow'
import { GalleryPreview, type PreviewAlbum, type PreviewPhoto } from './components/GalleryPreview'
import { Hero } from './components/Hero'
import { SectionHeading } from './components/SectionHeading'
import { ScheduleList, type ScheduleItem } from './ScheduleList'

// ISR: главная кэшируется и фоново ревалидируется. Все запросы — в try/catch →
// при сборке без БД (CI) и при пустой БД страница не падает, секции просто
// скрываются, а герой держит вид градиент-фолбэком.
export const revalidate = 60

type MediaLike = {
  url?: string | null
  alt?: string | null
  sizes?: Record<string, { url?: string | null } | undefined>
}
const asMedia = (m: unknown): MediaLike | null => (m && typeof m === 'object' ? (m as MediaLike) : null)
const mediaUrl = (m: unknown, size: 'card' | 'wide' | 'thumbnail' = 'card'): string | null => {
  const med = asMedia(m)
  if (!med) return null
  return med.sizes?.[size]?.url || med.url || null
}
const fmtMonth = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' }) : ''

async function getPublishedEvents() {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'events',
      where: { _status: { equals: 'published' } },
      sort: 'startDate',
      depth: 0,
      limit: 100,
    })
    return res.docs
  } catch {
    return null
  }
}

async function getRecentAlbums() {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'gallery',
      where: { _status: { equals: 'published' } },
      sort: '-date',
      depth: 1,
      limit: 3,
    })
    return res.docs
  } catch {
    return null
  }
}

async function getAboutTeaser() {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: 'o-sabantuy' } }, { _status: { equals: 'published' } }] },
      limit: 1,
      pagination: false,
      depth: 0,
    })
    return res.docs[0] ?? null
  } catch {
    return null
  }
}

async function getMapTeaser() {
  try {
    const payload = await getPayload({ config })
    return await payload.findGlobal({ slug: 'festival-map', depth: 1 })
  } catch {
    return null
  }
}

export default async function HomePage() {
  const [events, albums, about, map] = await Promise.all([
    getPublishedEvents(),
    getRecentAlbums(),
    getAboutTeaser(),
    getMapTeaser(),
  ])

  const items: ScheduleItem[] = (events ?? []).map((e) => ({
    id: e.id,
    slug: e.slug ?? null,
    title: e.title,
    summary: e.summary ?? null,
    location: e.location ?? null,
    venue: e.venue ?? null,
    startDate: e.startDate ?? null,
    endDate: e.endDate ?? null,
    category: e.category ?? null,
    registrationEnabled: Boolean(e.registrationEnabled),
  }))

  // «Фото-альбом» для оформления — с наибольшим числом снимков (живой фоторепортаж,
  // а не афиша-постер): его обложка идёт в герой, кадры — в тизер и ленту.
  const photoCount = (g: { photos?: unknown }) => (Array.isArray(g.photos) ? g.photos.length : 0)
  const featured = (albums ?? []).slice().sort((a, b) => photoCount(b) - photoCount(a))[0] ?? null
  const featuredPhotos = Array.isArray(featured?.photos) ? featured!.photos : []
  const heroUrl = mediaUrl(featured?.coverImage, 'wide') || mediaUrl(featured?.coverImage, 'card')

  // Тизер «О фестивале».
  const aboutText = about ? excerpt(about.content, 300) : ''
  const aboutPhoto =
    mediaUrl(featuredPhotos[1]?.image, 'card') || mediaUrl(featuredPhotos[0]?.image, 'card') || heroUrl

  // Превью галереи.
  const previewAlbums: PreviewAlbum[] = (albums ?? [])
    .map((a) => ({
      slug: String(a.slug ?? ''),
      title: a.title,
      meta: [fmtMonth(a.date), Array.isArray(a.photos) && a.photos.length ? `${a.photos.length} фото` : '']
        .filter(Boolean)
        .join(' · '),
      coverUrl: mediaUrl(a.coverImage, 'card'),
    }))
    .filter((a) => a.slug)
  const previewPhotos: PreviewPhoto[] = featuredPhotos
    .slice(0, 6)
    .map((p) => {
      const img = asMedia(p?.image)
      const src = mediaUrl(p?.image, 'card')
      return img && src ? { src, full: img.url || src, alt: p?.caption || img.alt || featured!.title } : null
    })
    .filter((x): x is PreviewPhoto => x !== null)

  // Тизер карты.
  const planUrl = mediaUrl(map?.planImage, 'card')
  const mapPoints = (Array.isArray(map?.points) ? map!.points : [])
    .filter((p) => p?.label)
    .slice(0, 4)
    .map((p) => ({ icon: mapTypeMeta(p.type).icon, label: p.label as string }))
  const hasMapTeaser = Boolean(planUrl) || mapPoints.length > 0

  return (
    <main>
      <Hero
        imageUrl={heroUrl}
        imageAlt="Сабантуй в Малмыже"
        eyebrow="Народный праздник Малмыжа"
        title={
          <>
            Сабантуй&nbsp;<span className="accent">Малмыж</span>
          </>
        }
        tagline="Праздник труда, силы и дружбы народов — каждое лето на малмыжской земле."
      >
        <Link className="btn btn-gold" href="#program">
          Программа фестиваля
        </Link>
        <Link className="btn btn-outline" href="/gallery">
          Галерея
        </Link>
        <Link className="btn btn-outline" href="/o-sabantuy">
          О фестивале
        </Link>
      </Hero>

      {/* Что вас ждёт */}
      <section className="section section--tint">
        <div className="section-inner">
          <SectionHeading eyebrow="Что вас ждёт" title="Праздник для всей семьи" align="center" tulip />
          <FeatureRow />
        </div>
      </section>

      {/* О фестивале — тизер */}
      {about && aboutText && (
        <section className="section section--alt">
          <div className="section-inner">
            <div className="split">
              {aboutPhoto && (
                <figure className="split-media frame-ornament">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={aboutPhoto} alt="Сабантуй в Малмыже" loading="lazy" />
                </figure>
              )}
              <div className="split-body">
                <SectionHeading eyebrow="Знакомство" title="О фестивале" />
                <p className="section-lead">{aboutText}</p>
                <Link className="btn btn-gold" href="/o-sabantuy">
                  Подробнее о фестивале →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Программа */}
      <section id="program" className="section">
        <div className="section-inner">
          <SectionHeading eyebrow="Расписание" title="Программа фестиваля" />
          {items.length > 0 ? (
            <ScheduleList items={items} />
          ) : (
            <div className="placeholder">
              Расписание пока не опубликовано. Организаторы добавляют события в{' '}
              <Link href="/admin" prefetch={false}>
                админке
              </Link>
              .
            </div>
          )}
        </div>
      </section>

      {/* Галерея — превью */}
      {previewAlbums.length > 0 && (
        <section className="section section--tint">
          <div className="section-inner">
            <SectionHeading eyebrow="Фотолетопись" title="Галерея праздника" />
            <GalleryPreview albums={previewAlbums} photos={previewPhotos} />
          </div>
        </section>
      )}

      {/* Карта — тизер */}
      {hasMapTeaser && (
        <section className="section">
          <div className="section-inner">
            <div className="split reverse">
              <div className="split-media">
                {planUrl ? (
                  <figure className="frame-ornament">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={planUrl} alt="План территории фестиваля" loading="lazy" />
                  </figure>
                ) : (
                  <div className="event-hero event-hero-fallback" aria-hidden="true">
                    <span>Карта скоро</span>
                  </div>
                )}
              </div>
              <div className="split-body">
                <SectionHeading eyebrow="Ориентируйтесь на месте" title="Карта фестиваля" />
                {map?.intro && <p className="section-lead">{map.intro}</p>}
                {mapPoints.length > 0 && (
                  <ul className="map-teaser-points">
                    {mapPoints.map((p, i) => (
                      <li key={i}>
                        <span aria-hidden="true">{p.icon}</span> {p.label}
                      </li>
                    ))}
                  </ul>
                )}
                <Link className="btn btn-gold" href="/map">
                  Открыть карту →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <CtaBand
        eyebrow="Добро пожаловать"
        title="Приходите на Сабантуй!"
        text="Берите семью и друзей — на майдане найдётся место каждому. До встречи в Малмыже!"
        primary={{ href: '/kontakty', label: 'Контакты' }}
        secondary={{ href: '/o-sabantuy', label: 'О фестивале' }}
      />
    </main>
  )
}
