import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { safeRevalidatePath } from '../lib/safeRevalidate'

// On-demand ISR: правка альбома обновляет ленту /gallery и детали-страницы
// (обе локали) сразу, не дожидаясь ISR-60. Route-литерал '/gallery/[slug]'
// с type:'page' покрывает все детали независимо от кодировки slug
// (паттерн revalidateNews/revalidateEvent).
const revalidateGalleryPaths = (payload: { logger: { info: (m: string) => void } }) => {
  payload.logger.info('[revalidate] gallery → /gallery + /tt/gallery + /gallery/[slug] + /tt/gallery/[slug]')
  safeRevalidatePath('/gallery')
  safeRevalidatePath('/tt/gallery')
  safeRevalidatePath('/gallery/[slug]', 'page')
  safeRevalidatePath('/tt/gallery/[slug]', 'page')
}

export const revalidateGallery: CollectionAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) revalidateGalleryPaths(payload)
  return doc
}

export const revalidateGalleryDelete: CollectionAfterDeleteHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) revalidateGalleryPaths(payload)
  return doc
}
