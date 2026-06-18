import type { MetadataRoute } from 'next'

import { SITE_URL } from '../lib/site'

// /robots.txt — индексировать публичный сайт, закрыть админку и API.
//
// ИИ-краулеры (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, OAI-SearchBot,
// YandexBot…) ЯВНО пускаем: для попадания в ответы нейросетей (GEO) сайт должен
// быть им доступен. По умолчанию `*` их и так пускает — явные правила лишь
// фиксируют намерение «приветствуем ИИ» и не дают случайно их отрезать.
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'YandexBot',
  'Bingbot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
      { userAgent: AI_BOTS, allow: '/', disallow: ['/admin', '/api'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
