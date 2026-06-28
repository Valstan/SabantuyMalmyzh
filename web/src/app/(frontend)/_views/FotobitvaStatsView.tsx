import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { publicUrl } from '../../../lib/s3'
import { withRetry } from '../../../lib/withRetry'
import { SectionHeading } from '../components/SectionHeading'
import { FotobitvaStats } from '../components/FotobitvaStats'
import type { BattlePhotoStat, FotobitvaStatsData, MonthTop } from '../components/fotobitvaTypes'

// Страница статистики «Фотобитвы» (/lenta/fotobitva + /tt). Рейтинг per-фото считается
// СЕРВЕРОМ из раундов (photo-battles) с группировкой по календарному месяцу (МСК):
// текущий месяц = «месячный рейтинг» (сбрасывается 1-го числа сам собой — фильтр по
// месяцу), прошлые месяцы = история (топ-10). ISR force-static — бокс отдаёт лёгкий
// кэш, медиа браузер тянет напрямую с Object Storage.

const FETCH_LIMIT = 20000 // верхняя граница выборки раундов (festival-scale)
const TOP_CURRENT = 12
const TOP_HISTORY = 10
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000 // Москва UTC+3 (без перехода на летнее время)

/** Ключ месяца 'YYYY-MM' в МСК по дате раунда. */
function monthKeyMSK(value: unknown): string {
  const d = new Date(value as string)
  if (Number.isNaN(d.getTime())) return '0000-00'
  const msk = new Date(d.getTime() + MSK_OFFSET_MS)
  return `${msk.getUTCFullYear()}-${String(msk.getUTCMonth() + 1).padStart(2, '0')}`
}

function currentMonthKeyMSK(): string {
  return monthKeyMSK(new Date().toISOString())
}

type BattleRow = {
  winner?: number | null
  winnerIndex?: number | null
  loser?: number | null
  loserIndex?: number | null
  createdAt?: string | null
}

type Tally = { wins: number; shows: number }

type SubDoc = {
  id: number
  status?: string | null
  kind?: string | null
  objectKey?: string | null
  authorName?: string | null
  media?: { kind?: string | null; objectKey?: string | null }[] | null
}

/** URL конкретного кадра поста (idx 0 = обложка), либо null если кадр не фото/нет/скрыт. */
function photoUrlAt(sub: SubDoc, idx: number): string | null {
  if (sub.status !== 'visible') return null
  const list: { kind: string; objectKey?: string | null }[] = [
    { kind: sub.kind === 'video' ? 'video' : 'photo', objectKey: sub.objectKey },
  ]
  if (Array.isArray(sub.media)) {
    for (const m of sub.media) list.push({ kind: m?.kind === 'video' ? 'video' : 'photo', objectKey: m?.objectKey })
  }
  const it = list[idx]
  if (!it || it.kind !== 'photo' || typeof it.objectKey !== 'string' || !it.objectKey) return null
  return publicUrl(it.objectKey)
}

// Топ месяца → BattlePhotoStat[] (резолв кадра по subs-карте; не-фото/удалённые отброшены).
function buildTop(
  tally: Map<string, Tally>,
  limit: number,
  subs: Map<number, SubDoc>,
): BattlePhotoStat[] {
  const sorted = [...tally.entries()]
    .map(([key, t]) => {
      const [subId, idx] = key.split(':').map(Number)
      return { subId, idx, wins: t.wins, shows: t.shows }
    })
    .filter((x) => x.wins > 0)
    .sort((a, b) => b.wins - a.wins || b.shows - a.shows)

  const out: BattlePhotoStat[] = []
  for (const x of sorted) {
    if (out.length >= limit) break
    const sub = subs.get(x.subId)
    if (!sub) continue
    const url = photoUrlAt(sub, x.idx)
    if (!url) continue
    out.push({ subId: x.subId, idx: x.idx, mediaUrl: url, authorName: sub.authorName ?? null, wins: x.wins, shows: x.shows })
  }
  return out
}

async function getData(): Promise<FotobitvaStatsData | null> {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'photo-battles',
        depth: 0,
        limit: FETCH_LIMIT,
        sort: '-createdAt',
        overrideAccess: true,
      })
      const rows = res.docs as BattleRow[]

      // 1) агрегируем победы/показы per (месяц, фото).
      const byMonth = new Map<string, Map<string, Tally>>()
      const tallyAdd = (m: Map<string, Tally>, key: string, win: boolean) => {
        const cur = m.get(key) ?? { wins: 0, shows: 0 }
        if (win) cur.wins += 1
        cur.shows += 1
        m.set(key, cur)
      }
      for (const r of rows) {
        if (r.winner == null || r.loser == null) continue
        const mk = monthKeyMSK(r.createdAt)
        const m = byMonth.get(mk) ?? new Map<string, Tally>()
        byMonth.set(mk, m)
        tallyAdd(m, `${r.winner}:${Number(r.winnerIndex) || 0}`, true)
        tallyAdd(m, `${r.loser}:${Number(r.loserIndex) || 0}`, false)
      }

      const currentMonth = currentMonthKeyMSK()

      // 2) собрать subId, нужные для топов (текущий + история), и подтянуть их одним find.
      const months = [...byMonth.keys()].sort().reverse() // новые сверху
      const neededSubs = new Set<number>()
      const collectNeeded = (mk: string, limit: number) => {
        const m = byMonth.get(mk)
        if (!m) return
        ;[...m.entries()]
          .filter(([, t]) => t.wins > 0)
          .sort((a, b) => b[1].wins - a[1].wins)
          .slice(0, limit)
          .forEach(([key]) => neededSubs.add(Number(key.split(':')[0])))
      }
      collectNeeded(currentMonth, TOP_CURRENT)
      months.filter((mk) => mk !== currentMonth).forEach((mk) => collectNeeded(mk, TOP_HISTORY))

      const subs = new Map<number, SubDoc>()
      if (neededSubs.size > 0) {
        const sres = await payload.find({
          collection: 'submissions',
          where: { id: { in: [...neededSubs] } },
          depth: 0,
          pagination: false,
          overrideAccess: true,
        })
        for (const d of sres.docs as SubDoc[]) subs.set(d.id as number, d)
      }

      // 3) собрать результат.
      const current = buildTop(byMonth.get(currentMonth) ?? new Map(), TOP_CURRENT, subs)
      const history: MonthTop[] = months
        .filter((mk) => mk !== currentMonth && mk !== '0000-00')
        .map((mk) => ({ month: mk, top: buildTop(byMonth.get(mk) ?? new Map(), TOP_HISTORY, subs) }))
        .filter((h) => h.top.length > 0)

      return { currentMonth, current, history, totalRounds: rows.length }
    })
  } catch {
    return null
  }
}

export async function FotobitvaStatsView({ locale }: { locale: Locale }) {
  const data = await getData()

  return (
    <main>
      <section className="section section--tint">
        <div className="section-inner">
          <SectionHeading
            eyebrow={t(locale, 'fotobitva.eyebrow')}
            title={t(locale, 'fotobitva.title')}
            tulip
          />
          <p className="section-lead">{t(locale, 'fotobitva.lead')}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <FotobitvaStats
            data={data ?? { currentMonth: currentMonthKeyMSK(), current: [], history: [], totalRounds: 0 }}
            locale={locale}
          />
        </div>
      </section>
    </main>
  )
}

export const fotobitvaMeta = (locale: Locale): Metadata => ({
  title: `${t(locale, 'fotobitva.title')} — Сабантуй в Малмыже`,
  description: t(locale, 'fotobitva.lead'),
  alternates: {
    canonical: locale === 'tt' ? '/tt/lenta/fotobitva' : '/lenta/fotobitva',
    languages: { 'ru-RU': '/lenta/fotobitva', 'tt-RU': '/tt/lenta/fotobitva' },
  },
})
