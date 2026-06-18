import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { SectionHeading } from '../components/SectionHeading'
import { QuizGame, type QuizClientQuestion } from '../components/QuizGame'

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

export async function QuizView({ locale }: { locale: Locale }) {
  const questions = await getQuestions(locale)

  return (
    <main>
      <section className="section">
        <div className="section-inner narrow">
          <SectionHeading eyebrow={t(locale, 'game.eyebrow')} title={t(locale, 'game.title')} />
          <QuizGame questions={questions} locale={locale} />
        </div>
      </section>
    </main>
  )
}

export const quizMeta = (locale: Locale): Metadata => ({
  title: `${t(locale, 'game.title')} — Сабантуй Малмыж`,
  description: t(locale, 'game.lead'),
})
