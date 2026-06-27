import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { VK_COMMUNITY_URL } from '../../../lib/site'
import { vkEmbedSrc } from '../../../lib/vkEmbed'
import { withRetry } from '../../../lib/withRetry'
import { SectionHeading } from '../components/SectionHeading'

// Прямой эфир (/efir, /tt/efir). Читает глобал live-stream: если «Эфир идёт» и ссылка
// VK распознана — встраивает плеер VK (видео раздаёт VK, наш бокс не грузится). Иначе —
// заглушка. ISR: меняется по тумблеру в /admin (revalidateLiveStream — мгновенно).
async function getLive() {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      return await payload.findGlobal({ slug: 'live-stream', depth: 0 })
    })
  } catch {
    return null
  }
}

export async function EfirView({ locale }: { locale: Locale }) {
  const live = await getLive()
  const src = live?.isLive ? vkEmbedSrc(live?.vkUrl as string | null | undefined) : null
  const note = (live?.note as string | null) || null

  return (
    <main>
      <section className="section section--tint">
        <div className="section-inner">
          <SectionHeading eyebrow={t(locale, 'efir.eyebrow')} title={t(locale, 'efir.title')} tulip />
          <p className="section-lead">{t(locale, 'efir.lead')}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          {src ? (
            <div className="efir-live">
              <p className="efir-badge">● {t(locale, 'efir.onair')}</p>
              {note && <p className="efir-note">{note}</p>}
              <div className="efir-player">
                <iframe
                  src={src}
                  title={t(locale, 'efir.title')}
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock"
                  allowFullScreen
                  frameBorder={0}
                />
              </div>
            </div>
          ) : (
            <div className="placeholder efir-offline">{t(locale, 'efir.offline')}</div>
          )}

          {/* Лёгкий путь к эфиру через VK: открывает сообщество (на телефоне —
              приложение VK), где идут официальные трансляции и можно вещать самим. */}
          <div className="efir-vk">
            <p>{t(locale, 'efir.vk.note')}</p>
            <a className="btn-primary" href={VK_COMMUNITY_URL} target="_blank" rel="noopener noreferrer">
              {t(locale, 'efir.vk.cta')}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}

export const efirMeta = (locale: Locale): Metadata => ({
  title: `${t(locale, 'efir.title')} — Сабантуй Малмыж`,
  description: t(locale, 'efir.lead'),
  alternates: {
    canonical: locale === 'tt' ? '/tt/efir' : '/efir',
    languages: { 'ru-RU': '/efir', 'tt-RU': '/tt/efir' },
  },
})
