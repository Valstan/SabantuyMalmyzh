import type { Access } from 'payload'

// Публичное чтение UGC-коллекций (submissions и далее reactions/comments): аноним
// видит ТОЛЬКО строки со status='visible' (постмодерация — скрытое/удалённое не
// утекает в публичный API), персонал (admin||editor) видит всё для разбора в /admin.
//
// Возвращаем Where-фильтр для анонима (Payload подмешивает его в запрос), true —
// для персонала. Образец доступа с query-constraint, рекомендованный Payload.
export const publicVisibleOrStaff: Access = ({ req: { user } }) => {
  if (user && Array.isArray(user.roles) && (user.roles.includes('admin') || user.roles.includes('editor'))) {
    return true
  }
  return { status: { equals: 'visible' } }
}
