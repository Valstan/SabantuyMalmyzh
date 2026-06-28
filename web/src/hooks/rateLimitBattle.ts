import type { CollectionBeforeValidateHook } from 'payload'

import { APIError } from 'payload'

import { rateLimit } from '../lib/rateLimit'
import { clientIp, relId } from '../lib/ugc'
import { assertVisiblePhoto } from './ugcHelpers'

// Раунд игры «Фотобитва» (POST /api/photo-battles). Аноним выбирает одно из двух фото.
// Без дедупа — повторные раунды это и есть игра; грубый флуд отсекает rate-limit по IP.
// Оба участника обязаны быть РАЗНЫМИ видимыми фото (анти-накрутка чужого/скрытого/видео).
const MAX = 150 // раундов
const WINDOW_MS = 10 * 60 * 1000 // за 10 минут на IP

export const rateLimitBattle: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  if (req.user) return data
  if (!data || typeof data !== 'object') throw new APIError('Некорректный запрос.', 400)

  const ip = clientIp(req.headers)
  const { ok, retryAfterMs } = rateLimit(`ugc-battle:${ip}`, MAX, WINDOW_MS)
  if (!ok) {
    const mins = Math.max(1, Math.ceil(retryAfterMs / 60_000))
    throw new APIError(`Слишком много действий. Попробуйте ещё раз через ${mins} мин.`, 429)
  }

  const winnerId = relId(data.winner)
  const loserId = relId(data.loser)
  if (!winnerId || !loserId) throw new APIError('Не указаны участники.', 400)
  if (winnerId === loserId) throw new APIError('Участники должны различаться.', 400)

  await assertVisiblePhoto(req, winnerId)
  await assertVisiblePhoto(req, loserId)

  return data
}
