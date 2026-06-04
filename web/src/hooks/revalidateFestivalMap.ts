import type { GlobalAfterChangeHook } from 'payload'

import { safeRevalidatePath } from '../lib/safeRevalidate'

// On-demand ISR: при изменении карты обновляем /map.
export const revalidateFestivalMap: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    payload.logger.info('[revalidate] festival-map → /map')
    safeRevalidatePath('/map')
  }
  return doc
}
