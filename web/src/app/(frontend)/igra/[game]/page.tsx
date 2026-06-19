import type { Metadata } from 'next'

import { QuizView, quizMeta } from '../../_views/QuizView'

// Конкретная игра /igra/[game] (ru). Неизвестный slug → notFound() в QuizView.
export const revalidate = 60

type Args = { params: Promise<{ game: string }> }

export default async function GamePage({ params }: Args) {
  const { game } = await params
  return <QuizView locale="ru" game={game} />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { game } = await params
  return quizMeta('ru', game)
}
