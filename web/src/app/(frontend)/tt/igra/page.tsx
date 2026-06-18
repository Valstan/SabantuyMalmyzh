import type { Metadata } from 'next'

import { QuizView, quizMeta } from '../../_views/QuizView'

// tt-зеркало игры-угадайки (I11).
export const revalidate = 60

export default function TtQuizPage() {
  return <QuizView locale="tt" />
}

export function generateMetadata(): Metadata {
  return quizMeta('tt')
}
