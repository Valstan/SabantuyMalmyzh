import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { SectionHeading } from '../components/SectionHeading'
import { QuizGame, type QuizClientQuestion } from '../components/QuizGame'
import type { QuizStatsData } from '../components/QuizStats'

// Общее тело игры-угадайки (ru: /igra, tt: /tt/igra). Сервер достаёт ОПУБЛИКОВАННЫЕ
// вопросы в нужной локали и отдаёт клиентскому QuizGame (там вся механика + localStorage).
//
// ⚠️ Local API (getPayload) по умолчанию overrideAccess:true → отдал бы и черновики.
// Поэтому фильтр `_status: published` ставим явно (фактчек до публикации).
async function getQuestions(locale: Locale): Promise<QuizClientQuestion[]> {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'quiz-questions',
      locale,
      depth: 0,
      limit: 200,
      sort: ['order', 'createdAt'],
      where: { _status: { equals: 'published' } },
    })
    return res.docs
      .map((d) => ({
        id: d.id,
        prompt: d.prompt,
        theme: d.theme ?? null,
        options: (Array.isArray(d.options) ? d.options : [])
          .filter((o) => o && typeof o.text === 'string')
          .map((o) => ({ text: o.text, correct: o.correct === true })),
        explanation: d.explanation ?? null,
        source: d.source ?? null,
        hint: d.hint ?? null,
      }))
      // Защита от битого контента: вопрос годен, если есть ≥2 вариантов и ровно один верный.
      .filter((q) => q.options.length >= 2 && q.options.filter((o) => o.correct).length === 1)
  } catch {
    return []
  }
}

// Обезличенная статистика прохождений. Считаем агрегат на сервере (по одному
// count на каждый возможный балл 0..N — N+1 лёгких запросов, как итоги опроса),
// read закрыт #015 → overrideAccess. Учитываем только результаты ТЕКУЩЕГО набора
// (total === число вопросов сейчас): если банк вопросов вырастет, старые
// результаты с другим total не подмешиваются в распределение «из N».
async function getQuizStats(totalQuestions: number): Promise<QuizStatsData | null> {
  if (totalQuestions <= 0) return null
  try {
    const payload = await getPayload({ config })
    const entries = await Promise.all(
      Array.from({ length: totalQuestions + 1 }, async (_unused, score) => {
        const r = await payload.count({
          collection: 'quiz-results',
          where: { total: { equals: totalQuestions }, score: { equals: score } },
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
  } catch {
    return null
  }
}

export async function QuizView({ locale }: { locale: Locale }) {
  const questions = await getQuestions(locale)
  const stats = await getQuizStats(questions.length)

  return (
    <main>
      <section className="section">
        <div className="section-inner narrow">
          <SectionHeading eyebrow={t(locale, 'game.eyebrow')} title={t(locale, 'game.title')} />
          <QuizGame questions={questions} locale={locale} initialStats={stats} />
        </div>
      </section>
    </main>
  )
}

export const quizMeta = (locale: Locale): Metadata => ({
  title: `${t(locale, 'game.title')} — Сабантуй Малмыж`,
  description: t(locale, 'game.lead'),
})
