import type { CollectionAfterChangeHook } from 'payload'

import { pushConfigured, sendPushToTopic } from '../lib/push'

// Push-уведомления подписчикам о новом контенте. Fire-and-forget: рассылка идёт
// фоном, публикация/загрузка не ждёт push-сервисы и не падает от их ошибок.

// Новость: пуш на ПЕРЕХОДЕ в published (создана опубликованной или draft→published).
// Правки уже опубликованной новости пуш НЕ шлют (иначе каждая опечатка = спам).
export const notifyPushNews: CollectionAfterChangeHook = ({ doc, previousDoc, req: { payload } }) => {
  if (!pushConfigured()) return doc
  const isPublished = doc._status === 'published'
  const wasPublished = previousDoc?._status === 'published'
  if (isPublished && !wasPublished) {
    void sendPushToTopic(payload, 'news', {
      title: 'Новость праздника',
      body: String(doc.title || ''),
      url: doc.slug ? `/novosti/${doc.slug}` : '/novosti',
      tag: `sabantuy-news-${doc.id}`,
    }).catch((err) => payload.logger.error(`[push] news failed: ${String(err)}`))
  }
  return doc
}

// Народная лента: пуш о новых фото/видео. Троттлинг 15 минут (module-level,
// сбрасывается рестартом — не критично): в день праздника загрузок много,
// каждая отдельным пушем = спам и отписки. Первая загрузка «окна» шлёт пуш,
// остальные молчат; общий tag → новое уведомление заменяет прежнее.
const LENTA_PUSH_INTERVAL_MS = 15 * 60_000
let lastLentaPushAt = 0

export const notifyPushLenta: CollectionAfterChangeHook = ({ doc, operation, req: { payload } }) => {
  if (!pushConfigured()) return doc
  if (operation !== 'create' || doc.status !== 'visible') return doc
  const now = Date.now()
  if (now - lastLentaPushAt < LENTA_PUSH_INTERVAL_MS) return doc
  lastLentaPushAt = now
  const kind = doc.kind === 'video' ? 'Новое видео' : 'Новые фото'
  void sendPushToTopic(payload, 'lenta', {
    title: 'Народная лента',
    body: `${kind} с праздника — смотрите на сайте!`,
    url: '/lenta',
    tag: 'sabantuy-lenta',
  }).catch((err) => payload.logger.error(`[push] lenta failed: ${String(err)}`))
  return doc
}
