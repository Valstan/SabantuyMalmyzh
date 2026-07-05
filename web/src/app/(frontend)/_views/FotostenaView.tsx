import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { withRetry } from '../../../lib/withRetry'
import { FotostenaGallery, type FotostenaItem } from '../components/FotostenaGallery'
import { SectionHeading } from '../components/SectionHeading'

// «Фотостена» (/fotostena + tt): одобренные модерацией кадры из открытых
// VK-постов о Сабантуе (коллекция vk-candidates, I8) — сетка с атрибуцией
// авторам и ссылками на исходники + единый лайтбокс. ISR; ревалидация — хук
// revalidateFotostena при модерации.

async function getApproved(): Promise<FotostenaItem[]> {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      // Все одобренные кадры (без верхнего лимита) — метаданные (URL/атрибуция)
      // легковесны; сами изображения грузятся лениво (loading="lazy") и порционно
      // на клиенте (FotostenaGallery: прогрессивный рендер ячеек по мере скролла).
      const res = await payload.find({
        collection: 'vk-candidates',
        where: { status: { equals: 'approved' }, media: { exists: true } },
        sort: '-vkPublishedAt',
        depth: 1,
        pagination: false,
        overrideAccess: true,
      })
      return res.docs
        .map((d) => {
          const doc = d as {
            id: number
            media?: { url?: string | null; alt?: string | null; sizes?: Record<string, { url?: string | null }> } | number | null
            authorName?: string | null
            postUrl?: string | null
          }
          const m = doc.media
          if (!m || typeof m === 'number') return null
          const full = m.url ?? null
          if (!full || !doc.postUrl) return null
          return {
            id: doc.id,
            thumbUrl: m.sizes?.thumbnail?.url || m.sizes?.card?.url || full,
            fullUrl: m.sizes?.wide?.url || full,
            alt: m.alt ?? null,
            authorName: doc.authorName ?? null,
            postUrl: doc.postUrl,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    })
  } catch {
    return []
  }
}

export async function FotostenaView({ locale }: { locale: Locale }) {
  const items = await getApproved()

  return (
    <main>
      <section className="section section--tint">
        <div className="section-inner">
          <SectionHeading eyebrow={t(locale, 'fotostena.eyebrow')} title={t(locale, 'fotostena.title')} />
          <p className="section-lead">{t(locale, 'fotostena.lead')}</p>
        </div>
      </section>
      <section className="section">
        <div className="section-inner">
          {items.length > 0 ? (
            <>
              <FotostenaGallery items={items} locale={locale} manageable />
              <p className="fotostena-disclaimer">{t(locale, 'fotostena.disclaimer')}</p>
            </>
          ) : (
            <div className="placeholder">{t(locale, 'fotostena.empty')}</div>
          )}
        </div>
      </section>
    </main>
  )
}

export const fotostenaMeta = (locale: Locale): Metadata => ({
  title: `${t(locale, 'fotostena.title')} — Сабантуй в Малмыже`,
  description: t(locale, 'fotostena.lead'),
})
