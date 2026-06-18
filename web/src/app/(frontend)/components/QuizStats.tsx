import { t, type Locale } from '../../../lib/i18n'

/**
 * Витрина обезличенной статистики игры-угадайки: общее число прошедших, средний
 * балл и распределение «сколько верных набрали». Данные считает сервер (агрегат
 * count по баллам, ISR-кэш), здесь — только отрисовка. Презентационный компонент
 * без хуков: используется и из клиентского QuizGame (с оптимистичным bumpStats).
 */
export type QuizStatsData = {
  players: number // сколько завершённых прохождений (для текущего набора вопросов)
  total: number // из скольких вопросов состоит набор (например, 16)
  average: number // средний балл (1 знак после запятой)
  distribution: { score: number; count: number }[] // по убыванию балла, только непустые
}

// Русская плюрализация существительного по числу (1 посетитель / 2 посетителя / 5 посетителей).
function pluralRu(n: number, forms: [string, string, string]): string {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return forms[0]
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1]
  return forms[2]
}

function visitorsLabel(n: number, locale: Locale): string {
  // Татарский не склоняет существительное после числа → одна форма из словаря.
  if (locale === 'tt') return `${n} ${t(locale, 'game.stats.visitorsTt')}`
  return `${n} ${pluralRu(n, ['посетитель', 'посетителя', 'посетителей'])}`
}

// Оптимистичное добавление одного результата в витрину (после успешного POST),
// чтобы игрок сразу увидел себя, не дожидаясь ревалидации ISR.
export function bumpStats(s: QuizStatsData | null, score: number, total: number): QuizStatsData {
  const base: QuizStatsData =
    s && s.total === total ? s : { players: 0, total, average: 0, distribution: [] }
  const distribution = base.distribution.map((d) => ({ ...d }))
  const idx = distribution.findIndex((d) => d.score === score)
  if (idx >= 0) distribution[idx].count += 1
  else distribution.push({ score, count: 1 })
  distribution.sort((a, b) => b.score - a.score)
  const players = base.players + 1
  const sum = distribution.reduce((acc, d) => acc + d.score * d.count, 0)
  return { players, total, average: Math.round((sum / players) * 10) / 10, distribution }
}

export function QuizStats({
  stats,
  locale = 'ru',
  youScore = null,
}: {
  stats: QuizStatsData | null
  locale?: Locale
  youScore?: number | null
}) {
  const heading = <h3 className="quiz-stats-title">{t(locale, 'game.stats.heading')}</h3>

  if (!stats || stats.players === 0) {
    return (
      <div className="quiz-stats quiz-stats--empty">
        {heading}
        <p className="quiz-stats-empty">{t(locale, 'game.stats.empty')}</p>
      </div>
    )
  }

  const maxCount = stats.distribution.reduce((m, d) => Math.max(m, d.count), 0)
  const ofWord = t(locale, 'game.of')

  return (
    <div className="quiz-stats">
      {heading}
      <div className="quiz-stats-top">
        <div className="quiz-stats-figure">
          <span className="quiz-stats-num">{stats.players}</span>
          <span className="quiz-stats-cap">{t(locale, 'game.stats.totalPlayers')}</span>
        </div>
        <div className="quiz-stats-figure">
          <span className="quiz-stats-num">
            {stats.average.toLocaleString('ru-RU')} {ofWord} {stats.total}
          </span>
          <span className="quiz-stats-cap">{t(locale, 'game.stats.average')}</span>
        </div>
      </div>

      <p className="quiz-stats-sub">{t(locale, 'game.stats.breakdown')}</p>
      <ul className="quiz-stats-dist">
        {stats.distribution.map((d) => {
          const pct = maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0
          const mine = youScore != null && d.score === youScore
          return (
            <li key={d.score} className={mine ? 'mine' : undefined}>
              <div className="quiz-stats-row-head">
                <span className="quiz-stats-score">
                  {d.score} {ofWord} {stats.total}
                  {mine ? ` · ${t(locale, 'game.stats.you')}` : ''}
                </span>
                <span className="quiz-stats-count">{visitorsLabel(d.count, locale)}</span>
              </div>
              <div className="quiz-stats-bar">
                <span style={{ width: `${Math.max(pct, 4)}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
