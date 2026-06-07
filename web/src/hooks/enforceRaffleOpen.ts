import type { CollectionBeforeValidateHook } from 'payload'

import { APIError } from 'payload'

// Серверный gate участия в розыгрыше (pool #015 — серверная проверка ≠ только UI).
// Форма показывается только при raffle.isOpen, но прямой POST /api/raffle-entries
// обходит UI-гейт. Здесь отклоняем публичную заявку, если розыгрыш не открыт.
// Только для анонимных create; персонал не ограничиваем.
export const enforceRaffleOpen: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  if (req.user) return data

  const raffleId = data?.raffle
  if (raffleId == null) return data // отсутствие raffle ловит required-валидация

  let raffle
  try {
    raffle = await req.payload.findByID({
      collection: 'raffle',
      id: typeof raffleId === 'object' ? raffleId.id : raffleId,
      depth: 0,
    })
  } catch {
    throw new APIError('Розыгрыш не найден.', 400)
  }

  if (raffle.isOpen !== true) {
    throw new APIError('Приём заявок на этот розыгрыш закрыт.', 400)
  }

  return data
}
