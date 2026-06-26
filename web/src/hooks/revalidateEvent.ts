import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Event } from '../payload-types'
import { safeRevalidatePath } from '../lib/safeRevalidate'

// On-demand ISR: при изменении события обновляем главную (расписание) и страницы
// событий — обе локали (детали-страницы теперь force-static, см. page.tsx). Route-литерал
// '/events/[slug]' с type:'page' покрывает все детали независимо от кодировки slug.
const revalidateEventPaths = (payload: { logger: { info: (m: string) => void } }) => {
  payload.logger.info('[revalidate] events → / + /tt + /events/[slug] + /tt/events/[slug]')
  safeRevalidatePath('/')
  safeRevalidatePath('/tt')
  safeRevalidatePath('/events/[slug]', 'page')
  safeRevalidatePath('/tt/events/[slug]', 'page')
}

export const revalidateEvent: CollectionAfterChangeHook<Event> = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) revalidateEventPaths(payload)
  return doc
}

export const revalidateEventDelete: CollectionAfterDeleteHook<Event> = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) revalidateEventPaths(payload)
  return doc
}
