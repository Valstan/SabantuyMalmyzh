import type { Metadata } from 'next'

import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import { abs } from '../../../lib/site'
import { withRetry } from '../../../lib/withRetry'
import { Countdown } from '../components/Countdown'
import { CountdownShare } from '../components/CountdownShare'
import { SectionHeading } from '../components/SectionHeading'

// «Сколько осталось до Сабантуя» (/otschet + /tt/otschet) — шаримая страница
// живого отсчёта: по ссылке из соцсетей открывается тикающий отсчёт (это и есть
// «живой» вариант — в самих постах чужой JS не исполняется) + панель «поделись
// открыткой» (челлендж). Цель — дата ближайшего события программы; фолбэк —
// официальные 10:00 МСК 4 июля 2026.

const FALLBACK_START = '2026-07-04T07:00:00.000Z'

async function getTargetIso(): Promise<string> {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'events',
        where: {
          and: [{ _status: { equals: 'published' } }, { startDate: { greater_than: new Date().toISOString() } }],
        },
        sort: 'startDate',
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
      return res.docs[0]?.startDate ?? FALLBACK_START
    })
  } catch {
    return FALLBACK_START
  }
}

export async function OtschetView({ locale }: { locale: Locale }) {
  const targetIso = await getTargetIso()
  const started = new Date(targetIso).getTime() <= Date.now()

  return (
    <main>
      <section className="section section--photo" style={{ ['--section-photo' as never]: 'url("/decor/decor-tulips-lg.jpg")' }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <SectionHeading
            eyebrow={t(locale, 'countdown.title')}
            title={t(locale, 'countdown.eyebrow')}
            align="center"
            tulip
          />
          {started ? (
            <p className="section-lead" style={{ margin: '0 auto', maxWidth: 620 }}>
              🎉 {t(locale, 'otschet.started')}
            </p>
          ) : (
            <Countdown targetIso={targetIso} locale={locale} />
          )}
          <p className="section-lead" style={{ margin: '1.25rem auto 0', maxWidth: 620 }}>
            {t(locale, 'otschet.lead')}
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.7rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn-gold" href={localeHref(locale, '/#program')}>
              {t(locale, 'home.schedule.eyebrow')}
            </Link>
            <Link className="btn btn-outline" href={localeHref(locale, '/novosti')}>
              {t(locale, 'nav.news')}
            </Link>
          </div>
        </div>
      </section>

      {!started && (
        <section className="section">
          <div className="section-inner" style={{ maxWidth: 760 }}>
            <CountdownShare targetIso={targetIso} locale={locale} />
          </div>
        </section>
      )}
    </main>
  )
}

export const otschetMeta = (locale: Locale): Metadata => ({
  title: `${t(locale, 'otschet.metaTitle')} — Сабантуй в Малмыже`,
  description: t(locale, 'otschet.lead'),
  openGraph: {
    title: t(locale, 'otschet.metaTitle'),
    description: t(locale, 'otschet.lead'),
    images: [{ url: abs('/og.jpg') }],
  },
})
