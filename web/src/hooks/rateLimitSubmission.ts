import type { CollectionBeforeValidateHook } from 'payload'

import { APIError } from 'payload'

import { rateLimit } from '../lib/rateLimit'
import { isAllowedMime } from '../lib/s3'
import { containsProfanity } from '../lib/profanity'
import {
  clampText,
  clientIp,
  OBJECT_KEY_RE,
  UGC_MAX_AUTHOR,
  UGC_MAX_CAPTION,
  UGC_MAX_PHOTO_MB,
  UGC_MAX_VIDEO_MB,
  UGC_PHASES,
} from '../lib/ugc'

// Анти-спам + валидация + санитайз публичной отправки в «Народную ленту»
// (POST /api/submissions). Контент анонимный (без аккаунтов); постмодерация → этот
// хук лишь отсекает грубый флуд и явный мусор/мат на входе. Персонал (ручной ввод
// в /admin) не ограничиваем.
//
// Серверная перепроверка НЕ доверяет клиент-валидации: objectKey должен иметь наш
// формат (media/<phase>/<yyyymm>/<uuid>.<ext> — не чужой путь в бакете), mime
// разрешён для kind, размер в пределах лимита. consent проверяется validate-полем.

const MAX = 15 // отправок
const WINDOW_MS = 15 * 60 * 1000 // за 15 минут на IP

export const rateLimitSubmission: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data
  if (req.user) return data
  if (!data || typeof data !== 'object') throw new APIError('Некорректный запрос.', 400)

  // 1) rate-limit по IP — до обращения к БД.
  const ip = clientIp(req.headers)
  const { ok, retryAfterMs } = rateLimit(`ugc-submit:${ip}`, MAX, WINDOW_MS)
  if (!ok) {
    const mins = Math.max(1, Math.ceil(retryAfterMs / 60_000))
    throw new APIError(`Слишком много загрузок. Попробуйте ещё раз через ${mins} мин.`, 429)
  }

  // 2) тип / фаза — обязательны и из известных значений (select-поле тоже валидирует,
  //    но проверяем явно, т.к. от них зависит проверка mime/размера).
  const kind = data.kind
  if (kind !== 'photo' && kind !== 'video') {
    throw new APIError('Тип должен быть photo или video.', 400)
  }
  if (typeof data.phase !== 'string' || !UGC_PHASES.includes(data.phase as never)) {
    throw new APIError('Неизвестная фаза.', 400)
  }

  // 3) objectKey — наш формат (анти-подмена чужого пути в бакете).
  if (typeof data.objectKey !== 'string' || !OBJECT_KEY_RE.test(data.objectKey)) {
    throw new APIError('Некорректный ключ объекта.', 400)
  }
  if (
    data.posterKey != null &&
    (typeof data.posterKey !== 'string' || !OBJECT_KEY_RE.test(data.posterKey))
  ) {
    throw new APIError('Некорректный ключ постера.', 400)
  }

  // 4) mime разрешён для kind, размер в пределах лимита.
  if (typeof data.mime !== 'string' || !isAllowedMime(kind, data.mime)) {
    throw new APIError('Неподдерживаемый формат файла.', 400)
  }
  const maxBytes = (kind === 'photo' ? UGC_MAX_PHOTO_MB : UGC_MAX_VIDEO_MB) * 1024 * 1024
  const bytes = Number(data.bytes)
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > maxBytes) {
    const mb = kind === 'photo' ? UGC_MAX_PHOTO_MB : UGC_MAX_VIDEO_MB
    throw new APIError(`Файл слишком большой (максимум ${mb} МБ).`, 413)
  }

  // 5) санитайз текста + стоп-фильтр мата.
  data.authorName = clampText(data.authorName, UGC_MAX_AUTHOR)
  data.caption = clampText(data.caption, UGC_MAX_CAPTION)
  if (
    (data.authorName && containsProfanity(data.authorName)) ||
    (data.caption && containsProfanity(data.caption))
  ) {
    throw new APIError('Текст содержит недопустимые выражения. Поправьте, пожалуйста.', 400)
  }

  return data
}
