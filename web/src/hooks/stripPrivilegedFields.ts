import type { CollectionBeforeValidateHook } from 'payload'

// G194: защитный слой — стирает привилегированные служебные поля из тела запроса
// до валидации, если запрос пришёл снаружи и не от персонала.
//
// Зачем, если у полей уже стоит field-level `access` (`adminOrEditorField`): при
// `overrideAccess: true` field-level access НЕ вызывается. Пока ни один наш
// server-роут не передаёт туда клиентское тело целиком (проверено grep'ом по
// `overrideAccess` в web/src), но это ровно тот класс, где дыру открывает
// следующая правка, а не текущая.
//
// ГЛАВНОЕ УСЛОВИЕ — ИСТОЧНИК ЗАПРОСА, А НЕ ТОЛЬКО РОЛЬ (2026-11-01):
// серверные пересчёты (`recountViews`/`recountComments`/`recountReactionLikes`/
// `applyContentReport`) пишут ровно эти поля через локальный API без юзера.
// Если стирать по признаку «нет staff», они молча перестанут обновлять счётчики:
// запись пройдёт, ошибки не будет, число просто не изменится.
// Поэтому `req.payloadAPI === 'local'` (вызов из нашего кода: хуки, роуты, сиды)
// пропускаем как есть, а стрижём только внешние запросы — `REST`/`GraphQL`.
// Роуты, где посетитель меняет служебное поле по своим правилам
// (`/api/ugc/delete-submission` ставит `status: 'removed'`), сами проверяют
// владельца до записи и вызывают API БЕЗ `req` — то есть остаются «local».
const PRIVILEGED_FIELDS = [
  'status',
  'hiddenReason',
  'likeCount',
  'commentCount',
  'viewCount',
  'battleWins',
  'battleShows',
  'reportCount',
  'ipHash',
  'userAgent',
  'ownerHash',
  'ownerVisitor',
] as const

export const stripPrivilegedFields: CollectionBeforeValidateHook = ({ data, req }) => {
  if (!data || typeof data !== 'object') return data

  // Свой код (локальный API) — не наше дело, что он пишет.
  if (req?.payloadAPI === 'local') return data

  const user = req?.user as { role?: string } | undefined
  const isStaff = user && (user.role === 'admin' || user.role === 'editor')
  if (isStaff) return data

  const d = data as Record<string, unknown>
  for (const field of PRIVILEGED_FIELDS) {
    if (field in d) delete d[field]
  }
  return data
}
