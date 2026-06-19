import type { GlobalAfterChangeHook } from 'payload'

import { safeRevalidatePath } from '../lib/safeRevalidate'

// On-demand ISR для глобалов контента сайта.
// home → главная (ru / + tt /tt), как page.
export const revalidateHome: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    payload.logger.info('[revalidate] home → / + /tt')
    safeRevalidatePath('/', 'page')
    safeRevalidatePath('/tt', 'page')
  }
  return doc
}

// header/footer рендерятся в корневом layout (SiteChrome) на КАЖДОЙ странице →
// инвалидируем весь поддеревом как layout (покрывает и /, и /tt, и все разделы).
export const revalidateChrome: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    payload.logger.info('[revalidate] header/footer → / (layout)')
    safeRevalidatePath('/', 'layout')
  }
  return doc
}
