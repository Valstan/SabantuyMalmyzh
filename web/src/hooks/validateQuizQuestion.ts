import type { CollectionBeforeValidateHook } from 'payload'

import { APIError } from 'payload'

// Кросс-строковая валидация вариантов ответа: ровно один правильный.
// Поле-уровень не видит остальные строки массива, поэтому проверяем здесь.
// Число вариантов (2–4) гарантирует minRows/maxRows самого массива.
export const validateQuizQuestion: CollectionBeforeValidateHook = ({ data }) => {
  // На update данные могут прийти частичными (без options) — тогда пропускаем:
  // итоговая «ровно один правильный» дособерётся из существующего документа.
  const options = data?.options
  if (!Array.isArray(options)) return data

  const correctCount = options.filter((o) => o && o.correct === true).length
  if (correctCount !== 1) {
    throw new APIError(
      `В вопросе должен быть ровно один правильный вариант (сейчас отмечено: ${correctCount}).`,
      400,
    )
  }

  return data
}
