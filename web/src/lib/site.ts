// Единый источник правды о сайте — URL, название, описание. Используется в
// разметке Schema.org (JSON-LD), llms.txt, robots, метаданных. Боевой URL
// бейкается из env при сборке; фолбэк — punycode-домен сабантуймалмыж.рф
// (кириллица в CI-bash бьётся — G11, поэтому ASCII-форма).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SERVER_URL || 'https://xn--80aaac1aqpgcf4bqn1j.xn--p1ai'
).replace(/\/$/, '')

export const SITE_NAME = 'Сабантуй в Малмыже'

// Сообщество ВКонтакте праздника — там идут официальные прямые эфиры (и куда ведёт
// кнопка «эфир в VK» со страницы /efir; на телефоне открывается приложение VK).
export const VK_COMMUNITY_URL = 'https://vk.com/malm4317sabantuikazanskaya'

export const SITE_DESC =
  'Народный праздник Малмыжа — труда, силы и дружбы народов. Программа, галерея, история и традиции Сабантуя.'

// Абсолютный URL из относительного пути (для JSON-LD/llms — нужны полные URL).
export const abs = (path: string): string =>
  path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
