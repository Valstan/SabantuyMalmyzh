import type { GlobalAfterChangeHook } from 'payload'

import { safeRevalidatePath } from '../lib/safeRevalidate'

// On-demand ISR: при включении/выключении эфира обновляем /efir (обе локали), чтобы
// плеер появлялся/исчезал сразу, не дожидаясь revalidate-окна.
export const revalidateLiveStream: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    payload.logger.info('[revalidate] live-stream → /efir, /tt/efir')
    safeRevalidatePath('/efir')
    safeRevalidatePath('/tt/efir')
  }
  return doc
}
