import type { CollectionBeforeValidateHook } from 'payload'

import { APIError } from 'payload'

import { rateLimit } from '../lib/rateLimit'

// Анти-спам публичного POST /api/registrations (PII-эндпоинт, 152-ФЗ).
//
// Лимит на анонимную отправку заявок с одного IP. Персонал (admin/editor) не
// ограничиваем — они заносят телефонные заявки. Бежит первым в beforeValidate,
// до обращения к БД в enforceRegistrationOpen.
//
// IP берём из заголовков прокси (на проде nginx ставит X-Forwarded-For /
// X-Real-IP). Локально без прокси заголовков нет → общая корзина 'unknown'.
const MAX = 5
const WINDOW_MS = 10 * 60 * 1000 // 10 минут

function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return headers.get('x-real-ip')?.trim() || 'unknown'
}

export const rateLimitRegistration: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data
  if (req.user) return data // персонал не лимитируем

  const ip = clientIp(req.headers)
  const { ok, retryAfterMs } = rateLimit(`reg:${ip}`, MAX, WINDOW_MS)

  if (!ok) {
    const mins = Math.max(1, Math.ceil(retryAfterMs / 60_000))
    throw new APIError(`Слишком много заявок. Попробуйте ещё раз через ${mins} мин.`, 429)
  }

  return data
}
