import { NextRequest, NextResponse } from 'next/server'

// SEO-переезд: старый домен сабантуймалмыж.рф → основной сабантуй.вмалмыже.рф.
// Постраничный 301 (путь+query сохраняются) — передаёт ссылочный вес и позволяет
// оформить «Переезд сайта» в Яндекс.Вебмастере / Change of Address в GSC.
// TLS терминируется на edge myjino, nginx бокса — catch-all → сюда доходит
// исходный Host; сравниваем по punycode (браузеры шлют IDN только так).
const OLD_HOSTS = new Set([
  'xn--80aaac1aqpgcf4bqn1j.xn--p1ai', // сабантуймалмыж.рф
  'www.xn--80aaac1aqpgcf4bqn1j.xn--p1ai',
])

const NEW_HOST = 'xn--80aac7atuli.xn--80adkdyec4j.xn--p1ai' // сабантуй.вмалмыже.рф

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0]
  if (!OLD_HOSTS.has(host)) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.protocol = 'https'
  url.host = NEW_HOST
  url.port = ''
  // 308 для не-GET: некоторые клиенты меняют метод POST→GET на 301.
  const status = req.method === 'GET' || req.method === 'HEAD' ? 301 : 308
  return NextResponse.redirect(url, status)
}
