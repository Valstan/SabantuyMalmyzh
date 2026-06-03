import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Event } from '../payload-types'
import { safeRevalidatePath } from '../lib/safeRevalidate'

// On-demand ISR: при изменении события обновляем главную (расписание) и страницы
// событий. Используем route-литерал '/events/[slug]' с type:'page' — он покрывает
// все детали-страницы независимо от кодировки кириллического slug.
const revalidateEventPaths = (payload: { logger: { info: (m: string) => void } }) => {
  payload.logger.info('[revalidate] events → / + /events/[slug]')
  safeRevalidatePath('/')
  safeRevalidatePath('/events/[slug]', 'page')
}

export const revalidateEvent: CollectionAfterChangeHook<Event> = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) revalidateEventPaths(payload)
  return doc
}

export const revalidateEventDelete: CollectionAfterDeleteHook<Event> = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) revalidateEventPaths(payload)
  return doc
}
