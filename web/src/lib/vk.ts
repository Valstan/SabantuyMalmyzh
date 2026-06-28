import { createHash, randomBytes } from 'crypto'

// VK ID OAuth 2.1 (вход «Войти через ВКонтакте» для посетителей ленты).
//
// Протокол: Authorization Code + PKCE (S256). client_secret в обмене кода НЕ участвует —
// PKCE его заменяет (подтверждено реализациями omniauth-vk_id и др.). Endpoints VK ID:
//   authorize  https://id.vk.ru/authorize           (GET-редирект пользователя)
//   token      https://id.vk.ru/oauth2/auth         (POST обмен кода на токен)
//   user_info  https://id.vk.ru/oauth2/user_info    (POST профиль по access_token)
// В callback VK кладёт code + state + device_id; device_id обязателен в обмене токена.
//
// Gated на env (как S3/SMTP): без VK_CLIENT_ID кнопка входа не показывается, роуты
// отдают 503 — сборка/типы зелёные без секретов. VK_CLIENT_SECRET для PKCE-обмена не
// нужен; храним опционально (на будущее: отзыв токена/иные server-to-server вызовы).
const AUTHORIZE_URL = 'https://id.vk.ru/authorize'
const TOKEN_URL = 'https://id.vk.ru/oauth2/auth'
const USERINFO_URL = 'https://id.vk.ru/oauth2/user_info'

const CLIENT_ID = process.env.VK_CLIENT_ID || ''
// Доп. скоупы (email/phone) НЕ запрашиваем — 152-ФЗ минимизация (берём только имя+аватар).
// При необходимости — VK_SCOPE="email" и т.п.
const SCOPE = process.env.VK_SCOPE || ''

/** Заданы ли креды VK (App ID). Без них вход в degraded-режиме (роуты → 503). */
export function isVkConfigured(): boolean {
  return Boolean(CLIENT_ID)
}

export function vkClientId(): string {
  return CLIENT_ID
}

/** redirect_uri должен СИМВОЛ-В-СИМВОЛ совпадать с зарегистрированным в кабинете VK. */
export function vkRedirectUri(): string {
  if (process.env.VK_REDIRECT_URI) return process.env.VK_REDIRECT_URI
  const base = (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/+$/, '')
  return `${base}/api/auth/vk/callback`
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** PKCE: верификатор (хранится в httpOnly-cookie до callback). */
export function makeCodeVerifier(): string {
  return b64url(randomBytes(48))
}

/** PKCE: challenge = base64url(SHA256(verifier)). */
export function codeChallengeOf(verifier: string): string {
  return b64url(createHash('sha256').update(verifier).digest())
}

/** Анти-CSRF state (сверяется с cookie в callback). */
export function makeState(): string {
  return b64url(randomBytes(16))
}

export function buildAuthorizeUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: vkRedirectUri(),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  if (SCOPE) params.set('scope', SCOPE)
  return `${AUTHORIZE_URL}?${params.toString()}`
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  user_id?: number | string
  error?: string
  error_description?: string
}

/** Обмен authorization code на access_token (PKCE; без client_secret). */
export async function exchangeToken(args: {
  code: string
  codeVerifier: string
  deviceId: string
  state: string
}): Promise<{ accessToken: string; userId: string | null }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    code_verifier: args.codeVerifier,
    client_id: CLIENT_ID,
    device_id: args.deviceId,
    redirect_uri: vkRedirectUri(),
    state: args.state,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json().catch(() => ({}))) as TokenResponse
  if (!res.ok || !json.access_token) {
    throw new Error(`vk token exchange failed: ${res.status} ${json.error || ''} ${json.error_description || ''}`.trim())
  }
  return { accessToken: json.access_token, userId: json.user_id != null ? String(json.user_id) : null }
}

export type VkProfile = { id: string; name: string; avatarUrl: string | null }

type UserInfoResponse = {
  user?: { user_id?: number | string; first_name?: string; last_name?: string; avatar?: string }
  error?: string
}

/** Профиль (id, имя, аватар) по access_token. */
export async function fetchUserInfo(accessToken: string, fallbackUserId: string | null): Promise<VkProfile> {
  const body = new URLSearchParams({ client_id: CLIENT_ID, access_token: accessToken })
  const res = await fetch(USERINFO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json().catch(() => ({}))) as UserInfoResponse
  const u = json.user
  const id = String(u?.user_id ?? fallbackUserId ?? '')
  if (!id) throw new Error(`vk user_info failed: ${res.status} ${json.error || ''}`.trim())
  const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim()
  return { id, name: name || 'Гость', avatarUrl: u?.avatar || null }
}
