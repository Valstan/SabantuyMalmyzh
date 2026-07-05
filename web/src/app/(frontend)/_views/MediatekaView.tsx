import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { withRetry } from '../../../lib/withRetry'
import { MediaLibrary, type LibraryItem } from '../components/MediaLibrary'
import { SectionHeading } from '../components/SectionHeading'

// Медиатека (/mediateka + tt): все картинки, залитые на сайт (коллекция Media),
// вне привязки к разделам — сетка миниатюр + единый лайтбокс сайта. ISR.
// Media.read = anyone → ничего непубличного тут нет (это те же файлы, что
// отдаются страницами). UGC-лента живёт в S3 и показывается на /lenta.

const LIMIT = 300

async function getImages(): Promise<LibraryItem[]> {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'media',
        where: { mimeType: { like: 'image' } },
        sort: '-createdAt',
        depth: 0,
        limit: LIMIT,
        overrideAccess: true,
      })
      return res.docs
        .map((d) => {
          const sizes = (d as { sizes?: Record<string, { url?: string | null }> }).sizes
          const full = (d as { url?: string | null }).url ?? null
          if (!full) return null
          return {
            thumbUrl: sizes?.thumbnail?.url || sizes?.card?.url || full,
            fullUrl: sizes?.wide?.url || full,
            alt: (d as { alt?: string | null }).alt ?? null,
          }
        })
        .filter((x): x is LibraryItem => x !== null)
    })
  } catch {
    return []
  }
}

export async function MediatekaView({ locale }: { locale: Locale }) {
  const items = await getImages()

  return (
    <main>
      <section className="section section--tint">
        <div className="section-inner">
          <SectionHeading eyebrow={t(locale, 'mediateka.eyebrow')} title={t(locale, 'mediateka.title')} />
          <p className="section-lead">{t(locale, 'mediateka.lead')}</p>
          <p className="section-lead">
            <a href={locale === 'tt' ? '/tt/fotostena' : '/fotostena'}>{t(locale, 'fotostena.title')} →</a>
          </p>
        </div>
      </section>
      <section className="section">
        <div className="section-inner">
          {items.length > 0 ? (
            <MediaLibrary items={items} locale={locale} />
          ) : (
            <div className="placeholder">{t(locale, 'mediateka.empty')}</div>
          )}
        </div>
      </section>
    </main>
  )
}

export const mediatekaMeta = (locale: Locale): Metadata => ({
  title: `${t(locale, 'mediateka.title')} — Сабантуй в Малмыже`,
  description: t(locale, 'mediateka.lead'),
})
