'use client'

import { useEffect, useMemo, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { effectiveDeckSize, getQuizRank, QUIZ_DECK_SIZE, quizThemeLabel } from '../../../lib/quiz'
import { QuizStats, bumpStats, type QuizStatsData } from './QuizStats'

/**
 * Клиентская игра-«угадайка». Сервер (QuizView) отдаёт опубликованные вопросы в
 * нужной локали; здесь — вся механика: один вопрос за раз, мгновенный фидбэк с
 * фактом и источником, в конце счёт + звание. Прогресс (лучший результат) —
 * в localStorage, без аккаунтов и записи в БД (директива brain: развлечение).
 *
 * Перемешивание вопросов/вариантов делаем по клику «Начать» (клиентское событие),
 * а не в рендере — иначе SSR и гидрация разойдутся (как mounted-флаг у Poll).
 */
export type QuizClientQuestion = {
  id: number
  prompt: string
  theme?: string | null
  image?: string | null
  imageSource?: string | null
  options: { text: string; correct: boolean }[]
  explanation?: string | null
  source?: string | null
  hint?: string | null
}

// Лучший результат (проценты 0–100) и флаг «результат отправлен» — раздельно по
// игре (ключ включает game), чтобы рекорд и «один POST на браузер» одной игры не
// мешали другой. total в ключе отправки: вырастет банк — игрок дошлёт новый набор.
const bestKey = (game: string) => `sabantuy:quiz-best:${game}`
const submittedKey = (game: string, total: number) => `sabantuy:quiz-sent:${game}:${total}`

type Phase = 'intro' | 'playing' | 'done'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const isUrl = (s: string) => /^https?:\/\//i.test(s.trim())

export function QuizGame({
  questions,
  locale = 'ru',
  game = 'sabantuy',
  initialStats = null,
}: {
  questions: QuizClientQuestion[]
  locale?: Locale
  game?: string
  initialStats?: QuizStatsData | null
}) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [deck, setDeck] = useState<QuizClientQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [best, setBest] = useState<number | null>(null)
  const [isNewBest, setIsNewBest] = useState(false)
  const [shared, setShared] = useState(false)
  const [stats, setStats] = useState<QuizStatsData | null>(initialStats)

  useEffect(() => {
    try {
      const v = localStorage.getItem(bestKey(game))
      if (v != null) setBest(Number(v))
    } catch {
      /* приватный режим — без рекорда */
    }
  }, [game])

  const total = deck.length || effectiveDeckSize(questions.length)

  function start() {
    // Перемешиваем банк и берём случайную выборку фиксированного размера
    // (QUIZ_DECK_SIZE) — короче и реиграбельнее; затем перемешиваем варианты
    // внутри каждого вопроса. Меньше банк — берётся целиком (slice не упадёт).
    setDeck(
      shuffle(questions)
        .slice(0, QUIZ_DECK_SIZE)
        .map((q) => ({ ...q, options: shuffle(q.options) })),
    )
    setIndex(0)
    setPicked(null)
    setCorrectCount(0)
    setShowHint(false)
    setIsNewBest(false)
    setShared(false)
    setPhase('playing')
  }

  const current = deck[index]

  function pick(i: number) {
    if (picked !== null || !current) return
    setPicked(i)
    if (current.options[i]?.correct) setCorrectCount((c) => c + 1)
  }

  function next() {
    if (index + 1 < deck.length) {
      setIndex((n) => n + 1)
      setPicked(null)
      setShowHint(false)
      return
    }
    // Конец — фиксируем результат и рекорд.
    const pct = deck.length > 0 ? Math.round((correctCount / deck.length) * 100) : 0
    if (best == null || pct > best) {
      setIsNewBest(best != null) // первый прогон рекордом не считаем
      setBest(pct)
      try {
        localStorage.setItem(bestKey(game), String(pct))
      } catch {
        /* приватный режим — рекорд не сохранится */
      }
    }
    void submitResult(correctCount, deck.length)
    setPhase('done')
  }

  // Отправка обезличенного результата в общую статистику (POST /api/quiz-results,
  // create=anyone). Один раз на браузер для данного набора (флаг в localStorage);
  // на сервере ещё rate-limit по IP. Витрину обновляем оптимистично, чтобы игрок
  // сразу увидел себя. Сеть упала — молча: статистика не критична.
  async function submitResult(score: number, totalQ: number) {
    if (totalQ <= 0) return
    try {
      if (localStorage.getItem(submittedKey(game, totalQ)) != null) return
    } catch {
      /* приватный режим — попробуем отправить, дубль отсечёт rate-limit */
    }
    try {
      const res = await fetch('/api/quiz-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, total: totalQ, game }),
      })
      if (!res.ok) return
      try {
        localStorage.setItem(submittedKey(game, totalQ), '1')
      } catch {
        /* приватный режим — засчитано на сервере */
      }
      setStats((s) => bumpStats(s, score, totalQ))
    } catch {
      /* офлайн / ошибка сети — молча */
    }
  }

  const rank = useMemo(() => getQuizRank(correctCount, total), [correctCount, total])

  async function share() {
    const text = `${rank.title[locale]} — ${correctCount}/${total}. ${t(locale, 'game.title')} «Сабантуй в Малмыже»`
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) {
        await navigator.share({ title: t(locale, 'game.title'), text, url })
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {
      /* пользователь отменил шеринг — молча */
    }
  }

  // — Нет вопросов —
  if (questions.length === 0) {
    return <div className="placeholder">{t(locale, 'game.empty')}</div>
  }

  // — Интро —
  if (phase === 'intro') {
    return (
      <div className="quiz quiz--intro">
        <p className="quiz-lead">{t(locale, 'game.lead')}</p>
        {best != null && (
          <p className="quiz-best">
            {t(locale, 'game.best')}: <strong>{best}%</strong>
          </p>
        )}
        <button type="button" className="btn-gold quiz-start" onClick={start}>
          {t(locale, 'game.start')}
        </button>
        <p className="quiz-note">{t(locale, 'game.savedNote')}</p>
        <QuizStats stats={stats} locale={locale} />
      </div>
    )
  }

  // — Результат —
  if (phase === 'done') {
    return (
      <div className="quiz quiz--done">
        <p className="quiz-eyebrow">{t(locale, 'game.scoreTitle')}</p>
        <p className="quiz-score">
          <strong>{correctCount}</strong> / {total}
        </p>
        <p className="quiz-score-sub">{t(locale, 'game.scoreCorrect')}</p>
        <h2 className="quiz-rank">{rank.title[locale]}</h2>
        <p className="quiz-rank-blurb">{rank.blurb[locale]}</p>
        {isNewBest && <p className="quiz-newbest">🎉 {t(locale, 'game.newBest')}</p>}
        {best != null && !isNewBest && (
          <p className="quiz-best">
            {t(locale, 'game.best')}: <strong>{best}%</strong>
          </p>
        )}
        <div className="quiz-actions">
          <button type="button" className="btn-gold" onClick={start}>
            {t(locale, 'game.restart')}
          </button>
          <button type="button" className="btn-outline" onClick={share}>
            {shared ? `✓ ${t(locale, 'game.shared')}` : t(locale, 'game.share')}
          </button>
        </div>
        <QuizStats stats={stats} locale={locale} youScore={correctCount} />
      </div>
    )
  }

  // — Игра —
  if (!current) return null
  const answered = picked !== null
  const correctIdx = current.options.findIndex((o) => o.correct)

  return (
    <div className="quiz quiz--playing">
      <div className="quiz-progress">
        <span>
          {t(locale, 'game.progress')} {index + 1} {t(locale, 'game.of')} {deck.length}
        </span>
        {current.theme && <span className="quiz-theme">{quizThemeLabel(current.theme, locale)}</span>}
      </div>
      <div
        className="quiz-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={deck.length}
        aria-valuenow={index + 1}
      >
        <span style={{ width: `${((index + 1) / deck.length) * 100}%` }} />
      </div>

      {current.image && (
        <figure className="quiz-image">
          <picture>
            <source srcSet={`/quiz/${current.image}.webp`} type="image/webp" />
            <img src={`/quiz/${current.image}.jpg`} alt={t(locale, 'game.imageAlt')} loading="lazy" />
          </picture>
        </figure>
      )}

      <p className="quiz-prompt">{current.prompt}</p>

      <ul className="quiz-options">
        {current.options.map((o, i) => {
          let cls = 'quiz-opt'
          if (answered) {
            if (i === correctIdx) cls += ' is-correct'
            else if (i === picked) cls += ' is-wrong'
            else cls += ' is-dim'
          }
          return (
            <li key={i}>
              <button
                type="button"
                className={cls}
                disabled={answered}
                onClick={() => pick(i)}
              >
                {o.text}
              </button>
            </li>
          )
        })}
      </ul>

      {!answered && current.hint && (
        <div className="quiz-hint">
          {showHint ? (
            <p>
              <span aria-hidden="true">💡 </span>
              {current.hint}
            </p>
          ) : (
            <button type="button" className="btn-ghost quiz-hint-btn" onClick={() => setShowHint(true)}>
              {t(locale, 'game.hint')}
            </button>
          )}
        </div>
      )}

      {answered && (
        <div className="quiz-feedback" aria-live="polite">
          <p className={picked === correctIdx ? 'quiz-verdict is-correct' : 'quiz-verdict is-wrong'}>
            {picked === correctIdx ? `✓ ${t(locale, 'game.correct')}` : `✗ ${t(locale, 'game.wrong')}`}
          </p>
          {picked !== correctIdx && correctIdx >= 0 && (
            <p className="quiz-answer">
              {t(locale, 'game.correctAnswer')} <strong>{current.options[correctIdx].text}</strong>
            </p>
          )}
          {current.explanation && <p className="quiz-explain">{current.explanation}</p>}
          {current.source && (
            <p className="quiz-source">
              {t(locale, 'game.source')}:{' '}
              {isUrl(current.source) ? (
                <a href={current.source} target="_blank" rel="noopener noreferrer">
                  {current.source}
                </a>
              ) : (
                <span>{current.source}</span>
              )}
            </p>
          )}
          {current.imageSource && (
            <p className="quiz-source quiz-source--photo">
              {t(locale, 'game.photoSource')}:{' '}
              <a href={current.imageSource} target="_blank" rel="noopener noreferrer">
                {current.imageSource}
              </a>
            </p>
          )}
          <button type="button" className="btn-gold quiz-next" onClick={next}>
            {index + 1 < deck.length ? t(locale, 'game.next') : t(locale, 'game.finish')}
          </button>
        </div>
      )}
    </div>
  )
}
