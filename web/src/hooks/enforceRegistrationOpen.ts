import type { CollectionBeforeValidateHook } from 'payload'

import { APIError } from 'payload'

// Серверный gate регистрации (pool #015 — серверная проверка ≠ только UI).
//
// Форма на сайте показывается только при event.registrationEnabled, но прямой
// POST /api/registrations этот UI-гейт обходит. Здесь отклоняем публичную заявку,
// если целевое событие не опубликовано или регистрация на него закрыта.
//
// Применяется ТОЛЬКО к анонимным create: персонал (admin/editor) может заносить
// телефонные заявки (source: phone) на события с закрытой веб-регистрацией.
export const enforceRegistrationOpen: CollectionBeforeValidateHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data
  if (req.user) return data // персонал не ограничиваем

  const eventId = data?.event
  if (eventId == null) return data // отсутствие event ловит required-валидация

  let event
  try {
    event = await req.payload.findByID({
      collection: 'events',
      id: typeof eventId === 'object' ? eventId.id : eventId,
      depth: 0,
    })
  } catch {
    throw new APIError('Мероприятие не найдено.', 400)
  }

  if (event._status !== 'published' || event.registrationEnabled !== true) {
    throw new APIError('Регистрация на это мероприятие закрыта.', 400)
  }

  return data
}
