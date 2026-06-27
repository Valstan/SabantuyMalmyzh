// Превращает ссылку на VK-видео/трансляцию в безопасный src для iframe-плеера.
// Принимаем только vk.com / vkvideo.ru и строим embed из распарсенных oid/id/hash —
// произвольный src в iframe НЕ подставляем (анти-инъекция, даже из /admin).

const ALLOWED_HOSTS = new Set(['vk.com', 'm.vk.com', 'vkvideo.ru', 'www.vk.com'])

function isInt(v: string | null): v is string {
  return !!v && /^-?\d+$/.test(v)
}

function build(oid: string, id: string, hash: string | null): string {
  const h = hash && /^[a-z0-9]+$/i.test(hash) ? `&hash=${hash}` : ''
  // hd=2 — повыше качество; autoplay не форсим (зритель сам жмёт play).
  return `https://vk.com/video_ext.php?oid=${oid}&id=${id}${h}&hd=2`
}

/** Безопасный iframe-src для VK-плеера, либо null если ссылка не распознана. */
export function vkEmbedSrc(input: string | null | undefined): string | null {
  if (!input) return null
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null

  // Форма 1: .../video_ext.php?oid=..&id=..&hash=..  (готовый embed)
  if (/\/video_ext\.php$/i.test(url.pathname)) {
    const oid = url.searchParams.get('oid')
    const id = url.searchParams.get('id')
    if (isInt(oid) && isInt(id)) return build(oid, id, url.searchParams.get('hash'))
    return null
  }

  // Форма 2: .../video{oid}_{id} или .../clip{oid}_{id}  (oid отрицателен для сообществ)
  const m = url.pathname.match(/\/(?:video|clip)(-?\d+)_(\d+)/)
  if (m) return build(m[1]!, m[2]!, url.searchParams.get('hash'))

  return null
}
