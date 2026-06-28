import type { MetadataRoute } from 'next'

/**
 * Web App Manifest (PWA, идея I10) → отдаётся как /manifest.webmanifest.
 * ⚠️ Файл-метадата ДОЛЖЕН лежать в КОРНЕ app/, НЕ в route-group (frontend) —
 * иначе Next молча его не генерит (грабля G12, как у robots.ts/sitemap.ts).
 * Next сам впрыскивает <link rel="manifest"> в <head>.
 *
 * Цвета — из палитры fest-токенов (изумруд #155c39, золото). display: standalone
 * → при «добавить на экран» открывается без браузерной обвязки.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Сабантуй в Малмыже',
    short_name: 'Сабантуй',
    description:
      'Народный праздник Малмыжа — программа, карта, галерея и традиции Сабантуя. Программа и карта доступны без сети.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'ru',
    dir: 'ltr',
    background_color: '#155c39',
    theme_color: '#155c39',
    categories: ['events', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
