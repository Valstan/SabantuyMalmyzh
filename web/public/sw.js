/*
 * Service worker «Сабантуй в Малмыже» (PWA, идея I10) — офлайн-доступ к программе и карте.
 * Рукописный, без зависимостей. Стратегии подобраны так, чтобы НЕ ломать ISR:
 *
 *   • навигации (страницы)  → network-first: онлайн всегда свежая версия (ISR честен),
 *                             без сети → последняя успешная из кэша, иначе /offline.
 *   • статика и медиа       → cache-first: /_next/static и хэш-имена иммутабельны;
 *                             посещённые медиа-файлы дают офлайн-вид страниц.
 *   • /admin и /api         → НЕ кэшируем вовсе (кроме /api/media/file/ — это GET-картинки).
 *
 * Версионируем имя кэша: при изменении логики SW поднять VERSION → activate подчистит старые.
 */
const VERSION = 'v2'
const CACHE = `sabantuy-${VERSION}`
const OFFLINE_URL = '/offline'
// Минимальный предкэш: офлайн-страница + манифест. Остальное кэшируется на лету.
const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await cache.addAll(PRECACHE)
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:png|jpe?g|svg|webp|gif|ico|woff2?|css|js)$/.test(url.pathname)
  )
}

// Кладём в кэш только пригодные ответы (200, same-origin, не редирект —
// сохранённый redirected-ответ ломает воспроизведение навигации).
async function putSafe(request, response) {
  if (!response || !response.ok || response.redirected) return
  const cache = await caches.open(CACHE)
  await cache.put(request, response.clone())
}

// ── Web-push: уведомления о новом контенте (Новости / Народная лента) ──
// payload — JSON {title, body, url, tag} из lib/push.ts. Клик ведёт на url
// (фокусируем уже открытую вкладку сайта, иначе открываем новую).
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    /* не-JSON payload — покажем заглушку */
  }
  const title = data.title || 'Сабантуй в Малмыже'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'sabantuy',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(url)
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Админка и API (кроме медиа-файлов) — всегда из сети, мимо кэша.
  if (url.pathname.startsWith('/admin')) return
  if (url.pathname.startsWith('/api') && !url.pathname.startsWith('/api/media/file/')) return

  // Навигации — network-first.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          await putSafe(request, fresh)
          return fresh
        } catch {
          const cached = await caches.match(request)
          return cached || (await caches.match(OFFLINE_URL)) || Response.error()
        }
      })(),
    )
    return
  }

  // Статика и медиа — cache-first.
  if (isStaticAsset(url) || url.pathname.startsWith('/api/media/file/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        try {
          const fresh = await fetch(request)
          await putSafe(request, fresh)
          return fresh
        } catch {
          return cached || Response.error()
        }
      })(),
    )
  }
})
