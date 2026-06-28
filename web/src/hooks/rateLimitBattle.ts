import type { CollectionBeforeValidateHook } from 'payload'

import { APIError } from 'payload'

import { rateLimit } from '../lib/rateLimit'
import { clientIp, relId } from '../lib/ugc'
import { assertVisiblePhotoAt } from './ugcHelpers'

// Раунд игры «Фотобитва» (POST /api/photo-battles). Аноним выбирает одно из двух ФОТО.
// Фото = публикация + индекс кадра (мульти-файловые посты дают в битву каждый кадр).
// Без дедупа на сервере — повторные раунды это и есть игра (дедуп пар — на клиенте, за
// сессию); грубый флуд отсекает rate-limit по IP. Оба участника — РАЗНЫЕ видимые фото.
const MAX = 150 // раундов
const WINDOW_MS = 10 * 60 * 1000 // за 10 минут на IP

const idx = (v: unknown): number => {
  const n = Number(v)
  return Number.isInteger(n) && n >= 0 ? n : 0
}

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
  const winnerIndex = idx(data.winnerIndex)
  const loserIndex = idx(data.loserIndex)
  data.winnerIndex = winnerIndex
  data.loserIndex = loserIndex
  // Фото различаются = различается пара (пост, индекс). Один пост, разные кадры — ОК.
  if (winnerId === loserId && winnerIndex === loserIndex) {
    throw new APIError('Участники должны различаться.', 400)
  }

  await assertVisiblePhotoAt(req, winnerId, winnerIndex)
  await assertVisiblePhotoAt(req, loserId, loserIndex)

  return data
}
