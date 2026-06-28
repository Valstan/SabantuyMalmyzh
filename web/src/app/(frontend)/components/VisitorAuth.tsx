'use client'

import { useEffect, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'

// Кнопка «Войти через VK» / чип вошедшего посетителя (имя + аватар + «Выйти») в шапке.
// Статус берём из /api/auth/vk/me: если VK не настроен — ничего не рендерим (gated).
// Вход — полноэкранный переход на /api/auth/vk/login (302 на VK); выход — POST + reload.
type MeState = { configured: boolean; visitor: { name: string; avatarUrl: string | null } | null }

export function VisitorAuth({ locale }: { locale: Locale }) {
  const [me, setMe] = useState<MeState | null>(null)
  const [loginHref, setLoginHref] = useState('/api/auth/vk/login')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    try {
      const next = window.location.pathname + window.location.search
      setLoginHref(`/api/auth/vk/login?next=${encodeURIComponent(next)}`)
    } catch {
      /* ssr/edge — дефолтный href */
    }
    let alive = true
    fetch('/api/auth/vk/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: MeState) => {
        if (alive) setMe(d)
      })
      .catch(() => {
        /* молча — кнопку просто не покажем */
      })
    return () => {
      alive = false
    }
  }, [])

  async function logout() {
    setBusy(true)
    try {
      await fetch('/api/auth/vk/logout', { method: 'POST', credentials: 'same-origin' })
    } catch {
      /* игнор */
    }
    window.location.reload()
  }

  if (!me || !me.configured) return null

  if (me.visitor) {
    // Показываем ТОЛЬКО аватар (без имени) — чтобы посетитель не смущался, что его имя
    // «светится» на сайте, и спокойнее выкладывал фото/видео. Аватар = видно, что вошёл.
    return (
      <span className="vk-auth vk-chip">
        {me.visitor.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="vk-avatar"
            src={me.visitor.avatarUrl}
            alt={t(locale, 'vk.loggedIn')}
            title={t(locale, 'vk.loggedIn')}
            width={28}
            height={28}
            loading="lazy"
          />
        ) : (
          <span className="vk-avatar vk-avatar--fallback" title={t(locale, 'vk.loggedIn')} aria-label={t(locale, 'vk.loggedIn')}>
            ✓
          </span>
        )}
        <button type="button" className="vk-logout" onClick={logout} disabled={busy} aria-label={t(locale, 'vk.logout')}>
          {t(locale, 'vk.logout')}
        </button>
      </span>
    )
  }

  return (
    <a className="vk-auth vk-login-btn" href={loginHref}>
      {t(locale, 'vk.login')}
    </a>
  )
}
