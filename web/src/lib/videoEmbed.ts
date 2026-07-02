import { vkEmbedSrc } from './vkEmbed'

// Ссылка на видео (VK / Rutube / YouTube) → безопасный src для iframe-плеера.
// Видео НЕ заливается на наш сервер — плеер проигрывает по ссылке с площадки.
// Анти-инъекция как в vkEmbed: произвольный URL в iframe не подставляем,
// src собирается из распарсенного id; неизвестная площадка → null (покажем
// обычную ссылку, не плеер).

/** Безопасный embed-src для видео-ссылки, либо null если площадка не распознана. */
export function videoEmbedSrc(input: string | null | undefined): string | null {
  const vk = vkEmbedSrc(input)
  if (vk) return vk
  if (!input) return null
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '')

  // Rutube: rutube.ru/video/<32hex>/ | /shorts/<32hex>/ | /play/embed/<32hex>
  if (host === 'rutube.ru') {
    const m = url.pathname.match(/^\/(?:video|shorts|play\/embed)\/([0-9a-f]{32})\/?/i)
    if (m) return `https://rutube.ru/play/embed/${m[1].toLowerCase()}`
    return null
  }

  // YouTube: youtube.com/watch?v=<id> | /shorts/<id> | /embed/<id> | youtu.be/<id>
  const ytId = (() => {
    if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0]
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') return url.searchParams.get('v')
      const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)
      return m ? m[1] : null
    }
    return null
  })()
  if (ytId && /^[\w-]{6,20}$/.test(ytId)) return `https://www.youtube-nocookie.com/embed/${ytId}`

  return null
}
