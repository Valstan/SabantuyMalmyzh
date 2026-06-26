import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Page } from '../payload-types'
import { safeRevalidatePath } from '../lib/safeRevalidate'

// On-demand ISR для статических страниц (/[slug] + tt-зеркало /tt/[slug] — обе теперь
// force-static, см. page.tsx). Route-литерал с type:'page' покрывает все страницы
// независимо от кодировки slug; обе локали — чтобы on-site правки применялись мгновенно.
const revalidatePagePaths = (payload: { logger: { info: (m: string) => void } }) => {
  payload.logger.info('[revalidate] pages → /[slug] + /tt/[slug]')
  safeRevalidatePath('/[slug]', 'page')
  safeRevalidatePath('/tt/[slug]', 'page')
}

export const revalidatePageDoc: CollectionAfterChangeHook<Page> = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) revalidatePagePaths(payload)
  return doc
}

export const revalidatePageDelete: CollectionAfterDeleteHook<Page> = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) revalidatePagePaths(payload)
  return doc
}
