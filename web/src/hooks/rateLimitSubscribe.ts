import type { CollectionBeforeValidateHook } from 'payload'

import { APIError } from 'payload'

import { rateLimit } from '../lib/rateLimit'

// Анти-спам публичного POST /api/subscribers (PII-эндпоинт, 152-ФЗ). Зеркало
// rateLimitRegistration: лимит на анонимную подписку с одного IP; персонал свободен.
// IP — из заголовков прокси (на проде nginx ставит X-Forwarded-For / X-Real-IP).
const MAX = 5
const WINDOW_MS = 10 * 60 * 1000 // 10 минут

function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return headers.get('x-real-ip')?.trim() || 'unknown'
}

export const rateLimitSubscribe: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data
  if (req.user) return data // персонал не лимитируем

  const ip = clientIp(req.headers)
  const { ok, retryAfterMs } = rateLimit(`sub:${ip}`, MAX, WINDOW_MS)

  if (!ok) {
    const mins = Math.max(1, Math.ceil(retryAfterMs / 60_000))
    throw new APIError(`Слишком много попыток. Повторите через ${mins} мин.`, 429)
  }

  return data
}
