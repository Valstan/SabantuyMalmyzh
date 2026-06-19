import type { Metadata } from 'next'

import Link from 'next/link'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import { getQuizGames } from '../../../lib/quizGames'
import { SectionHeading } from '../components/SectionHeading'

// Хаб-выбор игр (/igra, /tt/igra): карточки игр из каталога lib/quizGames.ts →
// ссылки на /igra/<slug>. Сами игры играются в QuizView (per-game route). Так
// первая игра не теряется, а новые добавляются конфигом без правки роутинга.
export function GamesHubView({ locale }: { locale: Locale }) {
  const h = (path: string) => localeHref(locale, path)
  const games = getQuizGames(locale)
  return (
    <main>
      <section className="section">
        <div className="section-inner">
          <SectionHeading
            eyebrow={t(locale, 'games.eyebrow')}
            title={t(locale, 'games.title')}
            align="center"
            tulip
          />
          <p
            className="section-lead"
            style={{ margin: '0 auto 1.75rem', textAlign: 'center', maxWidth: 620 }}
          >
            {t(locale, 'games.lead')}
          </p>
          <ul className="games-hub">
            {games.map((g) => (
              <li key={g.slug}>
                <Link className={`game-card game-card--${g.accent}`} href={h(`/igra/${g.slug}`)}>
                  <span className="game-card-icon" aria-hidden="true">
                    {g.icon}
                  </span>
                  <span className="game-card-body">
                    <span className="game-card-title">{g.title}</span>
                    <span className="game-card-desc">{g.description}</span>
                    <span className="game-card-cta">{t(locale, 'games.play')} →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}

export const gamesHubMeta = (locale: Locale): Metadata => ({
  title: `${t(locale, 'games.title')} — Сабантуй Малмыж`,
  description: t(locale, 'games.lead'),
  alternates: {
    canonical: locale === 'tt' ? '/tt/igra' : '/igra',
    languages: { 'ru-RU': '/igra', 'tt-RU': '/tt/igra' },
  },
})
