import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { publicUrl } from '../../../lib/s3'
import { withRetry } from '../../../lib/withRetry'
import { SectionHeading } from '../components/SectionHeading'
import { LentaFeed } from '../components/LentaFeed'
import type {
  LentaAuthorStat,
  LentaItem,
  LentaRatings,
  LentaTopItem,
} from '../components/lentaTypes'

// «Народная лента» (UGC, /lenta + /tt/lenta). Сервер тянет видимые публикации (ISR,
// force-static — медиа лежит в Object Storage, браузер грузит напрямую, наш бокс
// отдаёт только лёгкий кэшированный HTML). Сортировка/фильтр фаз и вкладки (Лента/
// Рейтинг) — на клиенте (LentaFeed), чтобы роут оставался статически кэшируемым.
// Рейтинги считаются здесь (сервер) из того же набора публикаций и передаются клиенту.

const FEED_LIMIT = 200 // сколько публикаций показываем в самой ленте
const FETCH_LIMIT = 2000 // верхняя граница выборки для рейтингов (festival-scale)
const TOP_N = 12 // длина топов «по лайкам»/«по просмотрам»
const TOP_AUTHORS = 30 // длина рейтинга авторов

type SubmissionDoc = {
  id: number
  kind?: string | null
  objectKey?: string | null
  posterKey?: string | null
  authorName?: string | null
  caption?: string | null
  phase?: string | null
  likeCount?: number | null
  commentCount?: number | null
  viewCount?: number | null
  battleWins?: number | null
  width?: number | null
  height?: number | null
  ownerVisitor?: number | null
}

function toItem(d: SubmissionDoc): LentaItem {
  const kind = d.kind === 'video' ? 'video' : 'photo'
  return {
    id: d.id,
    kind,
    mediaUrl: publicUrl(d.objectKey as string),
    posterUrl: d.posterKey ? publicUrl(d.posterKey) : null,
    authorName: d.authorName ?? null,
    caption: d.caption ?? null,
    phase: d.phase === 'festival' ? 'festival' : 'preparation',
    likeCount: Number(d.likeCount) || 0,
    commentCount: Number(d.commentCount) || 0,
    viewCount: Number(d.viewCount) || 0,
    width: d.width != null ? Number(d.width) : null,
    height: d.height != null ? Number(d.height) : null,
  }
}

function toTop(d: SubmissionDoc): LentaTopItem {
  return {
    id: d.id,
    kind: d.kind === 'video' ? 'video' : 'photo',
    mediaUrl: publicUrl(d.objectKey as string),
    posterUrl: d.posterKey ? publicUrl(d.posterKey) : null,
    authorName: d.authorName ?? null,
    likeCount: Number(d.likeCount) || 0,
    viewCount: Number(d.viewCount) || 0,
    battleWins: Number(d.battleWins) || 0,
  }
}

// ТОП авторов: только вошедшие через VK (ownerVisitor) — у них надёжная личность с
// именем/аватаром. Группируем по аккаунту, суммируем посты/лайки/просмотры, имя/аватар
// тянем из visitors одним запросом. Сортировка по умолчанию — по лайкам (клиент может
// пересортировать).
async function buildAuthors(
  payload: Awaited<ReturnType<typeof getPayload>>,
  docs: SubmissionDoc[],
): Promise<LentaAuthorStat[]> {
  const byVisitor = new Map<number, { postCount: number; totalLikes: number; totalViews: number }>()
  for (const d of docs) {
    const vid = d.ownerVisitor
    if (vid == null) continue
    const acc = byVisitor.get(vid) ?? { postCount: 0, totalLikes: 0, totalViews: 0 }
    acc.postCount += 1
    acc.totalLikes += Number(d.likeCount) || 0
    acc.totalViews += Number(d.viewCount) || 0
    byVisitor.set(vid, acc)
  }
  if (byVisitor.size === 0) return []

  const ids = [...byVisitor.keys()]
  const visitors = await payload.find({
    collection: 'visitors',
    where: { id: { in: ids } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const info = new Map<number, { name: string | null; avatarUrl: string | null }>()
  for (const v of visitors.docs) {
    info.set(v.id as number, {
      name: (v.name as string | null) ?? null,
      avatarUrl: (v.avatarUrl as string | null) ?? null,
    })
  }

  return [...byVisitor.entries()]
    .map(([visitorId, s]): LentaAuthorStat => ({
      visitorId,
      name: info.get(visitorId)?.name ?? null,
      avatarUrl: info.get(visitorId)?.avatarUrl ?? null,
      postCount: s.postCount,
      totalLikes: s.totalLikes,
      totalViews: s.totalViews,
    }))
    .sort((a, b) => b.totalLikes - a.totalLikes || b.totalViews - a.totalViews || b.postCount - a.postCount)
    .slice(0, TOP_AUTHORS)
}

async function getData(): Promise<{ items: LentaItem[]; ratings: LentaRatings } | null> {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'submissions',
        where: { status: { equals: 'visible' } },
        sort: '-createdAt',
        depth: 0,
        limit: FETCH_LIMIT,
        overrideAccess: true,
      })
      const docs = res.docs as SubmissionDoc[]

      const items = docs.slice(0, FEED_LIMIT).map(toItem)

      const topByLikes = [...docs]
        .filter((d) => (Number(d.likeCount) || 0) > 0)
        .sort((a, b) => (Number(b.likeCount) || 0) - (Number(a.likeCount) || 0))
        .slice(0, TOP_N)
        .map(toTop)
      const topByViews = [...docs]
        .filter((d) => (Number(d.viewCount) || 0) > 0)
        .sort((a, b) => (Number(b.viewCount) || 0) - (Number(a.viewCount) || 0))
        .slice(0, TOP_N)
        .map(toTop)
      const topByBattle = [...docs]
        .filter((d) => (Number(d.battleWins) || 0) > 0)
        .sort((a, b) => (Number(b.battleWins) || 0) - (Number(a.battleWins) || 0))
        .slice(0, TOP_N)
        .map(toTop)
      const authors = await buildAuthors(payload, docs)

      return { items, ratings: { authors, topByLikes, topByViews, topByBattle } }
    })
  } catch {
    return null
  }
}

export async function LentaView({ locale }: { locale: Locale }) {
  const data = await getData()

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
          <LentaFeed
            initialItems={data?.items ?? []}
            ratings={data?.ratings ?? { authors: [], topByLikes: [], topByViews: [], topByBattle: [] }}
            locale={locale}
          />
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
