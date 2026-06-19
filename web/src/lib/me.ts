/**
 * Клиентские помощники аутентификации для публичного фронта (on-site редактирование).
 *
 * Все запросы — на встроенные Payload REST-эндпоинты того же origin с
 * `credentials: 'include'`, чтобы слать/получать httpOnly-cookie `payload-token`.
 * Логин происходит ПРЯМО на сайте (модалка в шапке), без перехода в /admin.
 *
 * Калька с GONBA (web/src/utilities/me.ts), упрощённая под наши роли.
 */

export type MeUser = {
  id: number | string
  email?: string | null
  name?: string | null
  roles?: string[] | null
} | null

type MeResponse = { user: MeUser }

/**
 * Роли, которым доступно on-site редактирование контента. Совпадает с серверным
 * `adminOrEditor` (Pages/Events/Gallery/Media + глобалы). У нас только admin/editor
 * (см. collections/Users.ts) — другие роли PATCH'ить контент не смогут (403).
 */
const EDITOR_ROLES = ['admin', 'editor'] as const

/** Текущий пользователь (или null — гость / запрос не удался). */
export async function fetchMe(): Promise<MeUser> {
  try {
    const res = await fetch('/api/users/me', { credentials: 'include' })
    if (!res.ok) return null
    const data = (await res.json()) as MeResponse
    return data?.user ?? null
  } catch {
    return null
  }
}

/** true, если у пользователя есть роль admin/editor. */
export function isAdminUser(user: MeUser): boolean {
  if (!user) return false
  const roles = Array.isArray(user.roles) ? user.roles : []
  return roles.some((r) => (EDITOR_ROLES as readonly string[]).includes(r))
}

export type LoginResult = { ok: true; user: MeUser } | { ok: false; error: string }

/** Логин по email+паролю. На успехе Payload ставит cookie payload-token. */
export async function loginUser(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch('/api/users/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      // Payload возвращает { errors: [{ message }] } при неверных данных.
      let message = `Ошибка входа (${res.status})`
      try {
        const b = (await res.json()) as { errors?: Array<{ message?: string }> }
        if (b?.errors?.[0]?.message) message = b.errors[0].message
      } catch {
        /* оставим дефолтное сообщение */
      }
      return { ok: false, error: message }
    }
    const data = (await res.json()) as { user?: MeUser }
    return { ok: true, user: data?.user ?? null }
  } catch (e) {
    return { ok: false, error: String((e as Error).message || e) }
  }
}

/** Логаут — Payload чистит cookie payload-token. */
export async function logoutUser(): Promise<void> {
  try {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
  } catch {
    /* даже при сетевой ошибке UI сбросит локальное состояние */
  }
}

/**
 * Загрузка файла в коллекцию Media через REST (multipart). Возвращает id созданной
 * media-записи и её реальный URL раздачи (`doc.url` — у нас это путь по ИМЕНИ ФАЙЛА
 * `/api/media/file/<filename>`, НЕ по id; раздача по id отдаёт 500). null при ошибке.
 */
export async function uploadMedia(file: File, alt?: string): Promise<{ id: string; url: string } | null> {
  try {
    const form = new FormData()
    form.append('file', file)
    if (alt) form.append('_payload', JSON.stringify({ alt }))
    const res = await fetch('/api/media', { method: 'POST', credentials: 'include', body: form })
    if (!res.ok) return null
    const data = (await res.json()) as { doc?: { id: string | number; url?: string | null } }
    const doc = data?.doc
    if (doc?.id == null || !doc.url) return null
    return { id: String(doc.id), url: doc.url }
  } catch {
    return null
  }
}
