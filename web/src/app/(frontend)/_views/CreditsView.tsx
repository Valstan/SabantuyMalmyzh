import type { Metadata } from 'next'

import { t, type Locale } from '../../../lib/i18n'
import { IMAGE_CREDITS } from '../../../lib/imageCredits'
import { SectionHeading } from '../components/SectionHeading'

// «Источники фотографий» (/istochniki-foto, /tt/istochniki-foto) — атрибуция
// свободных фото Wikimedia Commons одной страницей (реестр lib/imageCredits.ts),
// чтобы не захламлять ссылками карточки программы. Полностью статична.
export function CreditsView({ locale }: { locale: Locale }) {
  return (
    <main>
      <section className="section section--tint">
        <div className="section-inner">
          <SectionHeading eyebrow={t(locale, 'credits.eyebrow')} title={t(locale, 'credits.title')} tulip />
          <p className="section-lead">{t(locale, 'credits.lead')}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <p className="credits-own">{t(locale, 'credits.own')}</p>

          <ul className="credits-list">
            {IMAGE_CREDITS.map((c) => (
              <li className="credits-item" key={c.slug}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="credits-thumb" src={`/decor/${c.slug}-480.jpg`} alt={c.title} loading="lazy" />
                <div className="credits-body">
                  <p className="credits-usage">{c.usage[locale] ?? c.usage.ru}</p>
                  <p className="credits-meta">
                    «{c.title}» — {t(locale, 'credits.author')}: {c.author} ·{' '}
                    {c.licenseUrl ? (
                      <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">
                        {c.license}
                      </a>
                    ) : (
                      c.license
                    )}
                  </p>
                  <p className="credits-meta">
                    <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {t(locale, 'credits.source')}
                    </a>
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="credits-note">{t(locale, 'credits.note')}</p>
        </div>
      </section>
    </main>
  )
}

export const creditsMeta = (locale: Locale): Metadata => ({
  title: `${t(locale, 'credits.title')} — Сабантуй в Малмыже`,
  description: t(locale, 'credits.lead'),
  alternates: {
    canonical: locale === 'tt' ? '/tt/istochniki-foto' : '/istochniki-foto',
    languages: { 'ru-RU': '/istochniki-foto', 'tt-RU': '/tt/istochniki-foto' },
  },
})
