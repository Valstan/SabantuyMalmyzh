import type { CollectionBeforeValidateHook } from 'payload'

import { APIError } from 'payload'

import { rateLimit } from '../lib/rateLimit'

// Анти-спам публичного голосования (POST /api/poll-votes). Опрос анонимный, без
// PII; «один голос на браузер» обеспечивает localStorage на фронте, а этот лимит
// просто отсекает грубый спам с одного IP. Персонал не ограничиваем.
//
// IP — из заголовков прокси (на проде nginx ставит X-Forwarded-For / X-Real-IP);
// локально без прокси → общая корзина 'unknown'.
const MAX = 20
const WINDOW_MS = 10 * 60 * 1000 // 10 минут

function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return headers.get('x-real-ip')?.trim() || 'unknown'
}

export const rateLimitPoll: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data
  if (req.user) return data

  const ip = clientIp(req.headers)
  const { ok, retryAfterMs } = rateLimit(`poll:${ip}`, MAX, WINDOW_MS)

  if (!ok) {
    const mins = Math.max(1, Math.ceil(retryAfterMs / 60_000))
    throw new APIError(`Слишком много голосов. Попробуйте ещё раз через ${mins} мин.`, 429)
  }

  return data
}
