import type { CollectionBeforeChangeHook } from 'payload'

import { clientIp, hashIp, ownerHashFromHeaders } from '../lib/ugc'
import { visitorFromHeaders } from '../lib/visitorSession'

// Проставляет служебные поля заявки в ленту на создании: необратимый хеш IP (для
// дедупа лайков/жалоб в PR3 и трассировки абьюза), user-agent и ownerHash (хеш
// браузерного токена X-UGC-Owner — по нему автор удаляет/правит «своё»). Запускается в
// beforeChange — ПОСЛЕ field-access (которое отбрасывает любые присланные анонимом
// значения этих полей), поэтому значение, выставленное здесь, доходит до БД.
// status/счётчики не трогаем — их даёт defaultValue полей (постмодерация: 'visible').
export const stampSubmissionMeta: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data

  const ip = clientIp(req.headers)
  data.ipHash = hashIp(ip)
  const ua = req.headers.get('user-agent')
  data.userAgent = ua ? ua.slice(0, 512) : undefined
  const owner = ownerHashFromHeaders(req.headers)
  if (owner) data.ownerHash = owner
  // VK-вход (PR5B): если посетитель залогинен — закрепляем контент за аккаунтом, чтобы
  // управлять «своим» с любого устройства. Сессия — отдельная подписанная cookie.
  const visitor = visitorFromHeaders(req.headers)
  if (visitor) data.ownerVisitor = visitor.visitorId

  return data
}
