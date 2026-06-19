import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { QuizQuestion } from '../payload-types'
import { safeRevalidatePath } from '../lib/safeRevalidate'

// On-demand ISR: при правке вопроса обновляем хаб игр (/igra, /tt/igra) и страницу
// конкретной игры (/igra/<game>, /tt/igra/<game>), к которой относится вопрос.
const revalidateQuizPaths = (
  payload: { logger: { info: (m: string) => void } },
  game?: string | null,
) => {
  payload.logger.info(`[revalidate] quiz → /igra + /tt/igra${game ? ` + /igra/${game}` : ''}`)
  safeRevalidatePath('/igra')
  safeRevalidatePath('/tt/igra')
  if (game) {
    safeRevalidatePath(`/igra/${game}`)
    safeRevalidatePath(`/tt/igra/${game}`)
  }
}

export const revalidateQuiz: CollectionAfterChangeHook<QuizQuestion> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) revalidateQuizPaths(payload, doc.game)
  return doc
}

export const revalidateQuizDelete: CollectionAfterDeleteHook<QuizQuestion> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) revalidateQuizPaths(payload, doc.game)
  return doc
}
