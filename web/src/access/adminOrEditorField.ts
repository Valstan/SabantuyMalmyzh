import type { FieldAccess } from 'payload'

// Field-level вариант adminOrEditor (pool #015): запрещает анониму задавать значение
// поля при публичном create. Если доступа нет — Payload отбрасывает присланное значение
// и применяет defaultValue. Используется на служебных полях заявки (status/source),
// чтобы посетитель не мог, например, прислать status=confirmed.
export const adminOrEditorField: FieldAccess = ({ req: { user } }) => {
  if (!user || !Array.isArray(user.roles)) return false
  return user.roles.includes('admin') || user.roles.includes('editor')
}
