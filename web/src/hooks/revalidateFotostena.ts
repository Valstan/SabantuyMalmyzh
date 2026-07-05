import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { safeRevalidatePath } from '../lib/safeRevalidate'

// On-demand ISR фотостены: модерация кандидата (approve/reject/удаление)
// обновляет /fotostena обеих локалей (паттерн revalidateNews).
const paths = (payload: { logger: { info: (m: string) => void } }) => {
  payload.logger.info('[revalidate] vk-candidates → /fotostena + /tt/fotostena')
  safeRevalidatePath('/fotostena')
  safeRevalidatePath('/tt/fotostena')
}

export const revalidateFotostena: CollectionAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate && !context.vkApproveInternal) paths(payload)
  return doc
}

export const revalidateFotostenaDelete: CollectionAfterDeleteHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) paths(payload)
  return doc
}
