import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { safeRevalidatePath } from '../lib/safeRevalidate'

// On-demand ISR: изменение новости обновляет ленту /novosti и детали-страницы
// (обе локали). Route-литерал '/novosti/[slug]' с type:'page' покрывает все
// детали независимо от кодировки slug (паттерн revalidateEvent).
const revalidateNewsPaths = (payload: { logger: { info: (m: string) => void } }) => {
  payload.logger.info('[revalidate] news → /novosti + /tt/novosti + /novosti/[slug] + /tt/novosti/[slug]')
  safeRevalidatePath('/novosti')
  safeRevalidatePath('/tt/novosti')
  safeRevalidatePath('/novosti/[slug]', 'page')
  safeRevalidatePath('/tt/novosti/[slug]', 'page')
}

export const revalidateNews: CollectionAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) revalidateNewsPaths(payload)
  return doc
}

export const revalidateNewsDelete: CollectionAfterDeleteHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) revalidateNewsPaths(payload)
  return doc
}
