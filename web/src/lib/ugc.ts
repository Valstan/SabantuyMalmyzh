import { createHash } from 'node:crypto'

// Общие константы и утилиты «Народной ленты» (UGC фото/видео).
// Разделяемы между коллекциями (Submissions и далее PR3 reactions/comments/reports),
// хуками и фронтом — единый источник правды по фазам/статусам/лимитам.

export const UGC_KINDS = ['photo', 'video'] as const
export const UGC_PHASES = ['preparation', 'festival'] as const
export const UGC_STATUSES = ['visible', 'hidden', 'removed'] as const

export type UgcKind = (typeof UGC_KINDS)[number]
export type UgcPhase = (typeof UGC_PHASES)[number]
export type UgcStatus = (typeof UGC_STATUSES)[number]

// Порог авто-скрытия по жалобам (PR3 content-reports). Постмодерация: контент виден
// сразу, но при накоплении жалоб система прячет до разбора персоналом.
export const UGC_REPORT_HIDE_THRESHOLD = Number(process.env.UGC_REPORT_HIDE_THRESHOLD) || 3

// Лимиты размера (МБ) — те же, что в endpoint sign-upload (lib/s3 / route). Сервер
// перепроверяет на создании записи, не доверяя только клиент-валидации.
export const UGC_MAX_PHOTO_MB = Number(process.env.UGC_MAX_PHOTO_MB) || 12
export const UGC_MAX_VIDEO_MB = Number(process.env.UGC_MAX_VIDEO_MB) || 100

// Длина текстовых полей (дублируется в maxLength полей — здесь для хук-санитайза).
export const UGC_MAX_AUTHOR = 64
export const UGC_MAX_CAPTION = 500

// Ключ объекта, который выдаёт buildObjectKey: media/<phase>/<yyyymm>/<uuid>.<ext>.
// Проверяем формат при создании записи, чтобы аноним не подсунул произвольный путь
// (напр. ссылку на чужой объект бакета).
export const OBJECT_KEY_RE =
  /^media\/[a-z0-9-]+\/\d{6}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/

/** IP клиента из заголовков прокси (на проде nginx ставит X-Forwarded-For / X-Real-IP). */
export function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return headers.get('x-real-ip')?.trim() || 'unknown'
}

// Соль для хеша IP: отдельный UGC_IP_SALT, иначе PAYLOAD_SECRET (всегда задан).
// Хеш нужен для дедупа лайков/жалоб и трассировки абьюза — храним необратимо (sha256,
// усечён до 128 бит), сам IP в БД не пишем (минимизация ПДн, 152-ФЗ).
const IP_SALT = process.env.UGC_IP_SALT || process.env.PAYLOAD_SECRET || 'sabantuy-ugc'

/** Необратимый хеш IP (для дедупа реакций/жалоб, не PII). */
export function hashIp(ip: string): string {
  return createHash('sha256').update(`${IP_SALT}:${ip}`).digest('hex').slice(0, 32)
}
