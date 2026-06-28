import { createHmac, timingSafeEqual } from 'crypto'

// Сессия посетителя (вошедшего через VK) — НЕЗАВИСИМА от стафф-входа `payload-token`.
// Лёгкая подписанная cookie (HMAC-SHA256 на PAYLOAD_SECRET), без внешних зависимостей и
// без БД-сессий: посетитель — не auth-коллекция Payload (пароля нет). В cookie кладём
// минимум для UI/привязки: внутренний visitorId (PK строки visitors), vkId, имя, аватар.
//
// Формат: base64url(JSON payload) + '.' + base64url(HMAC). На verify проверяем подпись
// (timing-safe) и возраст (maxAge). httpOnly → недоступна JS (анти-XSS); читается только
// сервером (роуты /api/auth/vk/*, хук штампа владельца).
export const VISITOR_COOKIE = 'sabantuy-visitor'
const MAX_AGE_SEC = 90 * 24 * 60 * 60 // 90 дней

const SECRET = process.env.PAYLOAD_SECRET || 'sabantuy-visitor-dev-secret'

export type VisitorSession = {
  visitorId: number
  vkId: string
  name: string
  avatarUrl: string | null
}

type Payload = VisitorSession & { iat: number }

function b64urlEncode(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s: string): string {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}
function sign(data: string): string {
  return createHmac('sha256', SECRET).update(data).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Подписать сессию → значение cookie. */
export function signVisitorSession(s: VisitorSession): string {
  const payload: Payload = { ...s, iat: Math.floor(Date.now() / 1000) }
  const body = b64urlEncode(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

/** Проверить значение cookie → сессия или null (битая подпись/просрочка/мусор). */
export function verifyVisitorSession(value: string | undefined | null): VisitorSession | null {
  if (!value || typeof value !== 'string' || !value.includes('.')) return null
  const dot = value.lastIndexOf('.')
  const body = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  const expected = sign(body)
  // timing-safe сравнение подписи
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const p = JSON.parse(b64urlDecode(body)) as Payload
    if (!p || typeof p.iat !== 'number') return null
    if (Math.floor(Date.now() / 1000) - p.iat > MAX_AGE_SEC) return null
    if (typeof p.visitorId !== 'number' || !p.vkId) return null
    return { visitorId: p.visitorId, vkId: String(p.vkId), name: String(p.name || ''), avatarUrl: p.avatarUrl ?? null }
  } catch {
    return null
  }
}

/** Прочитать сессию посетителя из заголовков запроса (Cookie). */
export function visitorFromHeaders(headers: Headers): VisitorSession | null {
  const cookie = headers.get('cookie')
  if (!cookie) return null
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]+)`))
  if (!m) return null
  let raw = m[1]!
  try {
    raw = decodeURIComponent(raw)
  } catch {
    /* значение могло быть без url-encoding */
  }
  return verifyVisitorSession(raw)
}

/** Атрибуты Set-Cookie для сессии (secure только на https-проде). */
export function visitorCookieAttrs(maxAgeSec = MAX_AGE_SEC): string {
  const secure = (process.env.NEXT_PUBLIC_SERVER_URL || '').startsWith('https') ? '; Secure' : ''
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`
}
