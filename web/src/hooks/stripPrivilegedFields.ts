import type { CollectionBeforeValidateHook } from 'payload'

// G194: защитный хук — стирает привилегированные служебные поля из тела запроса
// перед валидацией, если запрос идёт не от персонала (admin/editor). При
// `overrideAccess: true` (кастомные server-роуты) field-level access не вызывается,
// и без этого хука клиент мог бы подменить `status`/`hiddenReason`/счётчики и т.п.
// Для легитимных staff-обновлений (`req.user.role` = admin/editor) поля не трогаем.
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

export const stripPrivilegedFields: CollectionBeforeValidateHook = ({
  data,
  req,
}) => {
  if (!data || typeof data !== 'object') return data

  const user = req?.user as { role?: string } | undefined
  const isStaff = user && (user.role === 'admin' || user.role === 'editor')
  if (isStaff) return data

  const d = data as Record<string, unknown>
  for (const field of PRIVILEGED_FIELDS) {
    if (field in d) {
      delete d[field]
    }
  }
  return data
}
