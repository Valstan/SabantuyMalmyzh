import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { publicUrl } from '../../../lib/s3'
import { withRetry } from '../../../lib/withRetry'
import { SectionHeading } from '../components/SectionHeading'
import { LentaFeed } from '../components/LentaFeed'
import type { LentaItem } from '../components/lentaTypes'

// «Народная лента» (UGC, /lenta + /tt/lenta). Сервер тянет видимые публикации (ISR,
// force-static — медиа лежит в Object Storage, браузер грузит напрямую, наш бокс
// отдаёт только лёгкий кэшированный HTML). Сортировка/фильтр фаз — на клиенте
// (LentaFeed), чтобы роут оставался статически кэшируемым (без searchParams).
async function getItems(): Promise<LentaItem[] | null> {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'submissions',
        where: { status: { equals: 'visible' } },
        sort: '-createdAt',
        depth: 0,
        limit: 200,
        overrideAccess: true,
      })
      return res.docs.map((d): LentaItem => {
        const kind = d.kind === 'video' ? 'video' : 'photo'
        return {
          id: d.id as number,
          kind,
          mediaUrl: publicUrl(d.objectKey as string),
          posterUrl: d.posterKey ? publicUrl(d.posterKey as string) : null,
          authorName: (d.authorName as string | null) ?? null,
          caption: (d.caption as string | null) ?? null,
          phase: d.phase === 'festival' ? 'festival' : 'preparation',
          likeCount: Number(d.likeCount) || 0,
          commentCount: Number(d.commentCount) || 0,
          width: d.width != null ? Number(d.width) : null,
          height: d.height != null ? Number(d.height) : null,
        }
      })
    })
  } catch {
    return null
  }
}

export async function LentaView({ locale }: { locale: Locale }) {
  const items = await getItems()

  return (
    <main>
      <section className="section section--tint">
        <div className="section-inner">
          <SectionHeading
            eyebrow={t(locale, 'lenta.eyebrow')}
            title={t(locale, 'lenta.title')}
            tulip
          />
          <p className="section-lead">{t(locale, 'lenta.lead')}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          {/* Контейнер всегда: кнопка загрузки доступна и при пустой ленте. */}
          <LentaFeed initialItems={items ?? []} locale={locale} />
        </div>
      </section>
    </main>
  )
}

export const lentaMeta = (locale: Locale): Metadata => ({
  title: `${t(locale, 'lenta.title')} — Сабантуй Малмыж`,
  description: t(locale, 'lenta.lead'),
  alternates: {
    canonical: locale === 'tt' ? '/tt/lenta' : '/lenta',
    languages: { 'ru-RU': '/lenta', 'tt-RU': '/tt/lenta' },
  },
})
