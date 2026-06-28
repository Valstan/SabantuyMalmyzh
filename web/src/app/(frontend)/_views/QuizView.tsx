import type { Metadata } from 'next'

import config from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload, type Where } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { effectiveDeckSize } from '../../../lib/quiz'
import { DEFAULT_QUIZ_GAME, findQuizGame } from '../../../lib/quizGames'
import { withRetry } from '../../../lib/withRetry'
import { SectionHeading } from '../components/SectionHeading'
import { QuizGame, type QuizClientQuestion } from '../components/QuizGame'
import type { QuizStatsData } from '../components/QuizStats'

// Общее тело игры-угадайки (ru: /igra, tt: /tt/igra). Сервер достаёт ОПУБЛИКОВАННЫЕ
// вопросы в нужной локали и отдаёт клиентскому QuizGame (там вся механика + localStorage).
//
// ⚠️ Local API (getPayload) по умолчанию overrideAccess:true → отдал бы и черновики.
// Поэтому фильтр `_status: published` ставим явно (фактчек до публикации).
async function getQuestions(locale: Locale, game: string): Promise<QuizClientQuestion[]> {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: 'quiz-questions',
        locale,
        depth: 0,
        limit: 200,
        sort: ['order', 'createdAt'],
        where: { and: [{ _status: { equals: 'published' } }, { game: { equals: game } }] },
      })
      return res.docs
        .map((d) => ({
          id: d.id,
          prompt: d.prompt,
          theme: d.theme ?? null,
          image: d.image ?? null,
          imageSource: d.imageSource ?? null,
          options: (Array.isArray(d.options) ? d.options : [])
            .filter((o) => o && typeof o.text === 'string')
            .map((o) => ({ text: o.text, correct: o.correct === true })),
          explanation: d.explanation ?? null,
          source: d.source ?? null,
          hint: d.hint ?? null,
        }))
        // Защита от битого контента: вопрос годен, если есть ≥2 вариантов и ровно один верный.
        .filter((q) => q.options.length >= 2 && q.options.filter((o) => o.correct).length === 1)
    })
  } catch {
    return []
  }
}

// Обезличенная статистика прохождений. Считаем агрегат на сервере (по одному
// count на каждый возможный балл 0..N — N+1 лёгких запросов, как итоги опроса),
// read закрыт #015 → overrideAccess. Учитываем только результаты ТЕКУЩЕГО набора
// (total === число вопросов сейчас): если банк вопросов вырастет, старые
// результаты с другим total не подмешиваются в распределение «из N».
async function getQuizStats(totalQuestions: number, game: string): Promise<QuizStatsData | null> {
  if (totalQuestions <= 0) return null
  // Статистика раздельно по игре. Ранние результаты (до разделения) с пустым
  // game считаем за игру по умолчанию (Знаток Сабантуя).
  const gameWhere: Where =
    game === DEFAULT_QUIZ_GAME
      ? { or: [{ game: { equals: game } }, { game: { exists: false } }] }
      : { game: { equals: game } }
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const entries = await Promise.all(
        Array.from({ length: totalQuestions + 1 }, async (_unused, score) => {
          const r = await payload.count({
            collection: 'quiz-results',
            where: { and: [{ total: { equals: totalQuestions } }, { score: { equals: score } }, gameWhere] },
            overrideAccess: true,
          })
          return { score, count: r.totalDocs }
        }),
      )
      const players = entries.reduce((s, e) => s + e.count, 0)
      if (players === 0) return { players: 0, total: totalQuestions, average: 0, distribution: [] }
      const sum = entries.reduce((s, e) => s + e.score * e.count, 0)
      const average = Math.round((sum / players) * 10) / 10
      const distribution = entries.filter((e) => e.count > 0).sort((a, b) => b.score - a.score)
      return { players, total: totalQuestions, average, distribution }
    })
  } catch {
    return null
  }
}

export async function QuizView({
  locale,
  game = DEFAULT_QUIZ_GAME,
}: {
  locale: Locale
  game?: string
}) {
  const def = findQuizGame(game, locale)
  if (!def) notFound()
  const questions = await getQuestions(locale, def.slug)
  // Колода — случайная выборка фиксированного размера (effectiveDeckSize), её и
  // считает статистика: total === фактическая длина партии у клиента.
  const stats = await getQuizStats(effectiveDeckSize(questions.length), def.slug)

  return (
    <main>
      <section className="section">
        <div className="section-inner narrow">
          <SectionHeading eyebrow={t(locale, 'game.eyebrow')} title={def.title} />
          <QuizGame questions={questions} locale={locale} game={def.slug} initialStats={stats} />
        </div>
      </section>
    </main>
  )
}

export const quizMeta = (locale: Locale, game: string = DEFAULT_QUIZ_GAME): Metadata => {
  const def = findQuizGame(game, locale)
  const title = def?.title ?? t(locale, 'game.title')
  return {
    title: `${title} — Сабантуй в Малмыже`,
    description: def?.description ?? t(locale, 'game.lead'),
  }
}
