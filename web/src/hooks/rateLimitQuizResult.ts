import type { CollectionBeforeValidateHook } from 'payload'

import { APIError } from 'payload'

import { rateLimit } from '../lib/rateLimit'
import { QUIZ_GAME_VALUES } from '../lib/quizGames'

// Анти-спам + валидация публичной отправки результата игры (POST /api/quiz-results).
// Результат анонимный, без PII; «один результат на браузер» обеспечивает
// localStorage на фронте, а этот лимит просто отсекает грубый спам с одного IP.
// Плюс серверная проверка целостности (целые, 1 ≤ total ≤ MAX_TOTAL,
// 0 ≤ score ≤ total) — чтобы подделанный payload не портил агрегат. Персонал
// (ручной ввод в админке) не ограничиваем и не валидируем строго.
//
// IP — из заголовков прокси (на проде nginx ставит X-Forwarded-For / X-Real-IP);
// локально без прокси → общая корзина 'unknown'.
const MAX = 30
const WINDOW_MS = 10 * 60 * 1000 // 10 минут
const MAX_TOTAL = 500 // защитная верхняя граница на число вопросов

function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return headers.get('x-real-ip')?.trim() || 'unknown'
}

export const rateLimitQuizResult: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data
  if (req.user) return data

  const score = Number(data?.score)
  const total = Number(data?.total)
  if (
    !Number.isInteger(score) ||
    !Number.isInteger(total) ||
    total < 1 ||
    total > MAX_TOTAL ||
    score < 0 ||
    score > total
  ) {
    throw new APIError('Некорректный результат игры.', 400)
  }

  // game — необязательный slug игры; принимаем только известные значения,
  // прочее отбрасываем (агрегат не должен пачкаться мусором из публичного POST).
  if (data && typeof data === 'object') {
    data.game = QUIZ_GAME_VALUES.includes(data.game) ? data.game : undefined
  }

  const ip = clientIp(req.headers)
  const { ok, retryAfterMs } = rateLimit(`quiz:${ip}`, MAX, WINDOW_MS)
  if (!ok) {
    const mins = Math.max(1, Math.ceil(retryAfterMs / 60_000))
    throw new APIError(`Слишком много отправок. Попробуйте ещё раз через ${mins} мин.`, 429)
  }

  return data
}
