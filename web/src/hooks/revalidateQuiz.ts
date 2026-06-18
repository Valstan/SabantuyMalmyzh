import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { QuizQuestion } from '../payload-types'
import { safeRevalidatePath } from '../lib/safeRevalidate'

// On-demand ISR: при правке вопроса обновляем страницы игры (ru /igra, tt /tt/igra).
const revalidateQuizPaths = (payload: { logger: { info: (m: string) => void } }) => {
  payload.logger.info('[revalidate] quiz → /igra + /tt/igra')
  safeRevalidatePath('/igra')
  safeRevalidatePath('/tt/igra')
}

export const revalidateQuiz: CollectionAfterChangeHook<QuizQuestion> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) revalidateQuizPaths(payload)
  return doc
}

export const revalidateQuizDelete: CollectionAfterDeleteHook<QuizQuestion> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) revalidateQuizPaths(payload)
  return doc
}
