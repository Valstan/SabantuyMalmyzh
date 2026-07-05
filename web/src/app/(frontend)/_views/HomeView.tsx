import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'
import type { CSSProperties } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { eventJsonLd, faqJsonLd } from '../../../lib/jsonLd'
import { localeHref } from '../../../lib/localeHref'
import { getCultureSections } from '../../../lib/cultureSections'
import { JsonLd } from '../components/JsonLd'
import { excerpt } from '../../../lib/lexicalExcerpt'
import { mapTypeMeta } from '../../../lib/mapTypes'
import { POLL_OPTIONS } from '../../../lib/pollOptions'
import { publicUrl } from '../../../lib/s3'
import { withRetry } from '../../../lib/withRetry'
import { Countdown } from '../components/Countdown'
import { CountdownShare } from '../components/CountdownShare'
import { CtaBand } from '../components/CtaBand'
import { FeatureCard } from '../components/FeatureCard'
import { FeatureRow } from '../components/FeatureRow'
import { FestivalNotice } from '../components/FestivalNotice'
import { PhotoStripDivider } from '../components/PhotoStripDivider'
import { Poll } from '../components/Poll'
import { PushSubscribe } from '../components/PushSubscribe'
import { RaffleForm } from '../components/RaffleForm'
import { SectionDivider } from '../components/SectionDivider'
import { GalleryPreview, type PreviewAlbum, type PreviewPhoto } from '../components/GalleryPreview'
import { Hero } from '../components/Hero'
import { SectionHeading } from '../components/SectionHeading'
import { HomeEditor } from '../components/edit/HomeEditor'
import { SubscribeForm } from '../components/SubscribeForm'
import { ScheduleList, type ScheduleItem } from '../ScheduleList'

// Общее тело главной (ru: /, tt: /tt). Контент читаем с locale (tt → fallback ru),
// UI-строки — t(locale, …), ссылки — localeHref. ISR.
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
const photoBg = (url: string | null): CSSProperties | undefined =>
  url ? ({ ['--section-photo']: `url("${url}")` } as CSSProperties) : undefined

// Тюльпаны-фон секции отсчёта (карточка №3): статичный декор из web/public/decor/
// (зелёная вуаль секции приглушает теплоту до изумрудной гаммы).
const tulipBg = {
  ['--section-photo']:
    'image-set(url("/decor/decor-tulips-lg.webp") type("image/webp"), url("/decor/decor-tulips-lg.jpg") type("image/jpeg"))',
} as CSSProperties

async function getPublishedEvents(locale: Locale) {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'events',
        where: { _status: { equals: 'published' } },
        sort: 'startDate',
        depth: 0,
        limit: 100,
        locale,
      })
      return res.docs
    })
  } catch {
    return null
  }
}

async function getRecentAlbums(locale: Locale) {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'gallery',
        where: { _status: { equals: 'published' } },
        sort: '-date',
        depth: 1,
        limit: 3,
        locale,
      })
      return res.docs
    })
  } catch {
    return null
  }
}

async function getAboutTeaser(locale: Locale) {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'pages',
        where: { and: [{ slug: { equals: 'o-sabantuy' } }, { _status: { equals: 'published' } }] },
        limit: 1,
        pagination: false,
        depth: 0,
        locale,
      })
      return res.docs[0] ?? null
    })
  } catch {
    return null
  }
}

// Анонс-страница (slug sabantuy-2026): тизер на главной показываем ТОЛЬКО если она
// опубликована — иначе кнопка вела бы в 404 (страница засевается отдельным сидом).
async function getAnnouncement(locale: Locale) {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'pages',
        where: { and: [{ slug: { equals: 'sabantuy-2026' } }, { _status: { equals: 'published' } }] },
        limit: 1,
        pagination: false,
        depth: 0,
        locale,
      })
      return res.docs[0] ?? null
    })
  } catch {
    return null
  }
}

// Редактируемые тексты главной (глобал home, on-site PR3). Пусто/сбой → фолбэк на
// код/i18n в рендере (|| t(...)), ISR цел. depth:0 — медиа в глобале нет.
async function getHome(locale: Locale) {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      return await payload.findGlobal({ slug: 'home', depth: 0, locale })
    })
  } catch {
    return null
  }
}

async function getMapTeaser(locale: Locale) {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      return await payload.findGlobal({ slug: 'festival-map', depth: 1, locale })
    })
  } catch {
    return null
  }
}

async function getPollTallies(): Promise<Record<string, number> | null> {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const entries = await Promise.all(
        POLL_OPTIONS.map(async (o) => {
          const r = await payload.count({
            collection: 'poll-votes',
            where: { option: { equals: o.value } },
            overrideAccess: true,
          })
          return [o.value, r.totalDocs] as const
        }),
      )
      return Object.fromEntries(entries)
    })
  } catch {
    return null
  }
}

// Живой тизер «Народной ленты» на главной: свежие кадры + счётчик публикаций.
// Видео представлено постером (без постера — пропускаем: пустой квадрат не зовёт).
type LentaTeaser = { total: number; thumbs: { id: number; url: string; kind: 'photo' | 'video'; likes: number }[] }
async function getLentaTeaser(): Promise<LentaTeaser | null> {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'submissions',
        where: { status: { equals: 'visible' } },
        sort: '-createdAt',
        depth: 0,
        limit: 12,
        overrideAccess: true,
      })
      const thumbs = res.docs
        .map((d) => {
          const doc = d as unknown as {
            id: number
            kind?: string | null
            objectKey?: string | null
            posterKey?: string | null
            likeCount?: number | null
          }
          const kind = doc.kind === 'video' ? ('video' as const) : ('photo' as const)
          const key = kind === 'video' ? doc.posterKey : doc.objectKey
          if (!key) return null
          return { id: doc.id, url: publicUrl(key), kind, likes: Number(doc.likeCount) || 0 }
        })
        .filter((x): x is LentaTeaser['thumbs'][number] => x !== null)
        .slice(0, 8)
      return { total: res.totalDocs, thumbs }
    })
  } catch {
    return null
  }
}

async function getOpenRaffle(locale: Locale) {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'raffle',
        where: { isOpen: { equals: true } },
        limit: 1,
        pagination: false,
        depth: 0,
        locale,
      })
      return res.docs[0] ?? null
    })
  } catch {
    return null
  }
}

export async function HomeView({ locale }: { locale: Locale }) {
  const h = (path: string) => localeHref(locale, path)
  const [events, albums, about, map, pollTallies, openRaffle, home, announcement, lenta] = await Promise.all([
    getPublishedEvents(locale),
    getRecentAlbums(locale),
    getAboutTeaser(locale),
    getMapTeaser(locale),
    getPollTallies(),
    getOpenRaffle(locale),
    getHome(locale),
    getAnnouncement(locale),
    getLentaTeaser(),
  ])

  // Overlay редактируемого текста из глобала home (по ключу карточки); фолбэк — код.
  type Ov = { title?: string | null; text?: string | null }
  const featureOv: Record<string, Ov> = Object.fromEntries(
    (Array.isArray(home?.features) ? home!.features : []).map((r) => [r.key, { title: r.title, text: r.text }]),
  )
  const cultureOv: Record<string, Ov> = Object.fromEntries(
    (Array.isArray(home?.cultureCards) ? home!.cultureCards : []).map((r) => [r.key, { title: r.title, text: r.text }]),
  )

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

  const futureStarts = items
    .map((i) => (i.startDate ? new Date(i.startDate).getTime() : NaN))
    .filter((ts) => !Number.isNaN(ts) && ts > Date.now())
  const festivalStartIso = futureStarts.length ? new Date(Math.min(...futureStarts)).toISOString() : null

  const photoCount = (g: { photos?: unknown }) => (Array.isArray(g.photos) ? g.photos.length : 0)
  const featured = (albums ?? []).slice().sort((a, b) => photoCount(b) - photoCount(a))[0] ?? null
  const featuredPhotos = Array.isArray(featured?.photos) ? featured!.photos : []
  const heroUrl = mediaUrl(featured?.coverImage, 'wide') || mediaUrl(featured?.coverImage, 'card')

  const featurePhoto =
    mediaUrl(featuredPhotos[2]?.image, 'wide') || mediaUrl(featuredPhotos[3]?.image, 'wide') || heroUrl
  // CTA-полоса всегда на фото: галерейный кадр, иначе гарантированный декор-фон
  // (без него падала на малиновый section--crimson — владелец просил убрать красный).
  const ctaPhoto =
    mediaUrl(featuredPhotos[4]?.image, 'wide') ||
    mediaUrl(featuredPhotos[0]?.image, 'wide') ||
    '/decor/page-maydan-lg.jpg'

  const aboutText = about ? excerpt(about.content, 300) : ''
  const aboutPhoto =
    mediaUrl(featuredPhotos[1]?.image, 'card') || mediaUrl(featuredPhotos[0]?.image, 'card') || heroUrl

  const previewAlbums: PreviewAlbum[] = (albums ?? [])
    .map((a) => ({
      slug: String(a.slug ?? ''),
      title: a.title,
      meta: [fmtMonth(a.date), Array.isArray(a.photos) && a.photos.length ? `${a.photos.length}` : '']
        .filter(Boolean)
        .join(' · '),
      coverUrl: mediaUrl(a.coverImage, 'card'),
      href: h(`/gallery/${a.slug ?? ''}`),
    }))
    .filter((a) => a.slug)
  const stripPhotos = featuredPhotos
    .slice(-6)
    .map((p) => mediaUrl(p?.image, 'card'))
    .filter((s): s is string => Boolean(s))

  const previewPhotos: PreviewPhoto[] = featuredPhotos
    .slice(0, 6)
    .map((p) => {
      const img = asMedia(p?.image)
      const src = mediaUrl(p?.image, 'card')
      return img && src ? { src, full: img.url || src, alt: p?.caption || img.alt || featured!.title } : null
    })
    .filter((x): x is PreviewPhoto => x !== null)

  const planUrl = mediaUrl(map?.planImage, 'card')
  const mapPoints = (Array.isArray(map?.points) ? map!.points : [])
    .filter((p) => p?.label)
    .slice(0, 4)
    .map((p) => ({ icon: mapTypeMeta(p.type).icon, label: p.label as string }))
  const hasMapTeaser = Boolean(planUrl) || mapPoints.length > 0

  return (
    <main>
      {/* Schema.org: сам праздник (когда/где/что) + выверенные Q&A — для Google-сниппета
          и цитирования в ответах нейросетей. Ноль веса для браузера (серверный <script>). */}
      <JsonLd data={[eventJsonLd(locale), faqJsonLd(locale)]} />
      <HomeEditor locale={locale} />
      <Hero
        imageUrl={heroUrl}
        imageAlt="Сабантуй в Малмыже"
        eyebrow={home?.heroEyebrow || t(locale, 'hero.eyebrow')}
        title={
          <>
            Сабантуй в&nbsp;<span className="accent">{home?.heroTitleAccent || 'Малмыже'}</span>
          </>
        }
        tagline={home?.heroTagline || t(locale, 'hero.tagline')}
      >
        <Link className="btn btn-gold" href="#program">
          {t(locale, 'home.schedule.eyebrow')}
        </Link>
        <Link className="btn btn-outline" href={h('/gallery')}>
          {t(locale, 'nav.gallery')}
        </Link>
        <Link className="btn btn-outline" href={h('/o-sabantuy')}>
          {t(locale, 'nav.about')}
        </Link>
      </Hero>

      {/* Фотостена-баннер: кликабельный коллаж из реальных кадров праздника
          (public/decor/fotostena-collage.jpg — 8 одобренных фото /fotostena).
          Сразу под героем — владелец просил заметную «картинку-ссылку». */}
      <section className="section fotostena-banner-section">
        <div className="section-inner">
          <Link href={h('/fotostena')} className="fotostena-banner" aria-label={t(locale, 'fotostena.banner.cta')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/decor/fotostena-collage.jpg" alt={t(locale, 'fotostena.banner.title')} loading="lazy" />
            <span className="fotostena-banner-overlay">
              <span className="fotostena-banner-eyebrow">{t(locale, 'fotostena.banner.eyebrow')}</span>
              <span className="fotostena-banner-title">{t(locale, 'fotostena.banner.title')}</span>
              <span className="fotostena-banner-sub">{t(locale, 'fotostena.banner.sub')}</span>
              <span className="btn btn-gold fotostena-banner-cta">{t(locale, 'fotostena.banner.cta')} →</span>
            </span>
          </Link>
        </div>
      </section>

      {festivalStartIso && (
        <section className="section section--photo" style={tulipBg}>
          <div className="section-inner" style={{ textAlign: 'center' }}>
            <SectionHeading
              eyebrow={t(locale, 'countdown.title')}
              title={t(locale, 'countdown.eyebrow')}
              align="center"
            />
            <Countdown targetIso={festivalStartIso} locale={locale} />
            <FestivalNotice locale={locale} />
            {/* Челлендж «поделись отсчётом»: открытка PNG (можно со своим фото)
                + живая ссылка /otschet. Виральная механика к празднику. */}
            <CountdownShare targetIso={festivalStartIso} locale={locale} />
          </div>
        </section>
      )}

      {/* Анонс-баннер: большой Сабантуй-2026 (масштаб, почётные гости, антураж).
          Показываем только если страница /sabantuy-2026 опубликована (gate выше) —
          иначе CTA вёл бы в 404. Фон — выверенный кадр майдана + зелёная вуаль. */}
      {announcement && (
        <section className="section section--photo" style={photoBg('/decor/page-maydan-lg.jpg')}>
          <div className="section-inner" style={{ textAlign: 'center' }}>
            <SectionHeading
              eyebrow={t(locale, 'home.anons.eyebrow')}
              title={t(locale, 'home.anons.title')}
              align="center"
              tulip
            />
            <p className="section-lead" style={{ margin: '0 auto', maxWidth: 640 }}>
              {t(locale, 'home.anons.lead')}
            </p>
            <div style={{ marginTop: '1.75rem' }}>
              <Link className="btn btn-gold" href={h('/sabantuy-2026')}>
                {t(locale, 'home.anons.cta')}
              </Link>
            </div>
          </div>
        </section>
      )}

      <section
        className={`section ${featurePhoto ? 'section--photo' : 'section--tint'}`}
        style={photoBg(featurePhoto)}
      >
        <div className="section-inner">
          <SectionHeading
            eyebrow={home?.featuresEyebrow || t(locale, 'home.features.eyebrow')}
            title={home?.featuresTitle || t(locale, 'home.features.title')}
            align="center"
            tulip
          />
          <FeatureRow locale={locale} overrides={featureOv} />
        </div>
      </section>

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
                <SectionHeading eyebrow={t(locale, 'home.about.eyebrow')} title={t(locale, 'home.about.title')} />
                <p className="section-lead">{aboutText}</p>
                <Link className="btn btn-gold" href={h('/o-sabantuy')}>
                  {t(locale, 'home.about.more')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section section--green">
        <div className="section-inner">
          <SectionHeading
            eyebrow={home?.cultureEyebrow || t(locale, 'home.culture.eyebrow')}
            title={home?.cultureTitle || t(locale, 'home.culture.title')}
            align="center"
            tulip
          />
          <p className="section-lead" style={{ margin: '0 auto', textAlign: 'center' }}>
            {home?.cultureLead || t(locale, 'home.culture.lead')}
          </p>
          <div className="feature-row culture-hub">
            {getCultureSections(locale).map((s) => {
              const o = cultureOv[s.key]
              const { key: _key, ...rest } = s
              return (
                <FeatureCard
                  key={s.href}
                  {...rest}
                  href={h(s.href)}
                  title={o?.title || s.title}
                  text={o?.text || s.text}
                  coverLayout
                />
              )
            })}
          </div>
        </div>
      </section>

      <PhotoStripDivider photos={stripPhotos} />

      <section id="program" className="section">
        <div className="section-inner">
          <SectionHeading eyebrow={t(locale, 'nav.schedule')} title={t(locale, 'home.schedule.eyebrow')} />
          {items.length > 0 && <FestivalNotice locale={locale} />}
          <PushSubscribe locale={locale} />
          {items.length > 0 ? (
            <>
              <ScheduleList items={items} locale={locale} />
              {/* Атрибуция свободных фото-миниатюр — одной ссылкой, не под карточками */}
              <p className="schedule-credits">
                <Link href={localeHref(locale, '/istochniki-foto')}>
                  {t(locale, 'schedule.photoCredits')}
                </Link>
              </p>
            </>
          ) : (
            <div className="placeholder">{t(locale, 'home.schedule.emptyAdmin')}</div>
          )}
        </div>
      </section>

      {previewAlbums.length > 0 && (
        <section className="section section--tint">
          <div className="section-inner">
            <SectionHeading eyebrow={t(locale, 'home.gallery.eyebrow')} title={t(locale, 'home.gallery.title')} />
            <GalleryPreview albums={previewAlbums} photos={previewPhotos} locale={locale} />
          </div>
        </section>
      )}

      <section className="section section--alt">
        <div className="section-inner">
          <SectionHeading eyebrow={t(locale, 'home.poll.eyebrow')} title={t(locale, 'home.poll.title')} align="center" />
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <Poll initialTallies={pollTallies ?? {}} locale={locale} />
          </div>
        </div>
      </section>

      {/* Тизер игры-угадайки: круглогодичный познавательный контент, держит сайт
          «живым» в межсезонье (идея brain про lifecycle). Зовём на /igra; механика
          и статистика — там. Без БД-запроса: чистый CTA, легко двигать/убрать. */}
      <section className="section section--green">
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <SectionHeading
            eyebrow={t(locale, 'home.game.eyebrow')}
            title={t(locale, 'home.game.title')}
            align="center"
            tulip
          />
          <p className="section-lead" style={{ margin: '0 auto', maxWidth: 620 }}>
            {t(locale, 'home.game.lead')}
          </p>
          <div style={{ marginTop: '1.75rem' }}>
            <Link className="btn btn-gold" href={h('/igra')}>
              {t(locale, 'home.game.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Живой тизер «Народной ленты» (UGC): свежие кадры гостей + счётчик + призыв
          выложить своё (deep-link /lenta#upload — сразу форма) и «смотреть подряд»
          (/lenta#flow — свайп-просмотр как в клипах). Пустая лента → чистый CTA. */}
      <section className="section section--tint home-lenta">
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <SectionHeading
            eyebrow={t(locale, 'home.lenta.eyebrow')}
            title={t(locale, 'home.lenta.title')}
            align="center"
            tulip
          />
          <p className="section-lead" style={{ margin: '0 auto', maxWidth: 620 }}>
            {lenta && lenta.total > 0
              ? t(locale, 'home.lenta.count').replace('{n}', String(lenta.total))
              : t(locale, 'home.lenta.lead')}
          </p>
          {lenta && lenta.thumbs.length > 0 && (
            <Link className="home-lenta-strip" href={h('/lenta#flow')} aria-label={t(locale, 'lenta.flow.open')}>
              {lenta.thumbs.map((th, i) => (
                <span className={`home-lenta-thumb ${i % 2 ? 'tilt-b' : 'tilt-a'}`} key={th.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={th.url} alt="" loading="lazy" />
                  {th.kind === 'video' && <span className="home-lenta-play" aria-hidden="true">▶</span>}
                  {th.likes > 0 && <span className="home-lenta-likes">🌷 {th.likes}</span>}
                </span>
              ))}
            </Link>
          )}
          <div className="home-lenta-actions">
            <Link className="btn btn-gold" href={h('/lenta#upload')}>
              📸 {t(locale, 'home.lenta.upload')}
            </Link>
            {lenta && lenta.thumbs.length > 0 && (
              <Link className="btn btn-outline" href={h('/lenta#flow')}>
                ▶ {t(locale, 'lenta.flow.open')}
              </Link>
            )}
            <Link className="home-lenta-all" href={h('/lenta')}>
              {t(locale, 'home.lenta.cta')} →
            </Link>
          </div>
        </div>
      </section>

      {hasMapTeaser && (
        <section className="section">
          <div className="section-inner">
            <div className="split reverse">
              <div className="split-media">
                {planUrl ? (
                  <figure className="frame-ornament">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={planUrl} alt={t(locale, 'home.map.title')} loading="lazy" />
                  </figure>
                ) : (
                  <div className="event-hero event-hero-fallback" aria-hidden="true">
                    <span>{t(locale, 'home.map.soon')}</span>
                  </div>
                )}
              </div>
              <div className="split-body">
                <SectionHeading eyebrow={t(locale, 'home.map.eyebrow')} title={t(locale, 'home.map.title')} />
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
                <Link className="btn btn-gold" href={h('/map')}>
                  {t(locale, 'home.map.open')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {openRaffle && (
        <section className="section section--green">
          <div className="section-inner">
            <SectionHeading eyebrow={t(locale, 'home.raffle.eyebrow')} title={openRaffle.title} align="center" />
            {openRaffle.prize && (
              <p className="section-lead" style={{ textAlign: 'center' }}>
                🎁 {t(locale, 'raffle.prize')}: {openRaffle.prize}
              </p>
            )}
            {openRaffle.description && (
              <p className="section-lead" style={{ textAlign: 'center' }}>
                {openRaffle.description}
              </p>
            )}
            <div style={{ maxWidth: 480, margin: '1.5rem auto 0' }}>
              <RaffleForm raffleId={openRaffle.id} locale={locale} />
            </div>
          </div>
        </section>
      )}

      <section className="section section--alt">
        <div className="section-inner">
          <SectionHeading
            eyebrow={t(locale, 'home.subscribe.eyebrow')}
            title={t(locale, 'home.subscribe.title')}
            align="center"
          />
          <p className="section-lead" style={{ textAlign: 'center' }}>
            {t(locale, 'home.subscribe.lead')}
          </p>
          <div style={{ maxWidth: 480, margin: '1.5rem auto 0' }}>
            <SubscribeForm locale={locale} />
          </div>
        </div>
      </section>

      <SectionDivider variant="ornament" tall />

      <CtaBand
        eyebrow={t(locale, 'home.cta.eyebrow')}
        title={t(locale, 'home.cta.title')}
        text={t(locale, 'home.cta.text')}
        imageUrl={ctaPhoto}
        primary={{ href: h('/kontakty'), label: t(locale, 'nav.contacts') }}
        secondary={{ href: h('/o-sabantuy'), label: t(locale, 'nav.about') }}
      />
    </main>
  )
}
