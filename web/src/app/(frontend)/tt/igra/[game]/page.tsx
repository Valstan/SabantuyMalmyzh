import type { Metadata } from 'next'

import { QuizView, quizMeta } from '../../../_views/QuizView'

// tt-зеркало конкретной игры /tt/igra/[game]. Неизвестный slug → notFound().
export const revalidate = 60
// probe 2026-06-26: force-static → ISR-кэш (см. ru-зеркало).
export const dynamic = 'force-static'

type Args = { params: Promise<{ game: string }> }

export default async function TtGamePage({ params }: Args) {
  const { game } = await params
  return <QuizView locale="tt" game={game} />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { game } = await params
  return quizMeta('tt', game)
}
