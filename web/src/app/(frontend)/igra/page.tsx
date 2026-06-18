import type { Metadata } from 'next'

import { QuizView, quizMeta } from '../_views/QuizView'

// ISR: вопросы меняются редко (revalidateQuiz on-demand при правке). Тело — _views/QuizView.
export const revalidate = 60

export default function QuizPage() {
  return <QuizView locale="ru" />
}

export function generateMetadata(): Metadata {
  return quizMeta('ru')
}
