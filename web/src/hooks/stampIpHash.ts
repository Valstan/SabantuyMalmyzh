import type { CollectionBeforeChangeHook } from 'payload'

import { clientIp, hashIp } from '../lib/ugc'

// Проставляет необратимый хеш IP на создании (дедуп лайков/жалоб, трассировка абьюза;
// не PII). beforeChange — ПОСЛЕ field-access, которое отбрасывает присланный анонимом
// ipHash → значение, выставленное здесь, доходит до БД. Для реакций/жалоб (без UA);
// у submissions/comments отдельный stampSubmissionMeta (ipHash + userAgent).
export const stampIpHash: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data
  data.ipHash = hashIp(clientIp(req.headers))
  return data
}
