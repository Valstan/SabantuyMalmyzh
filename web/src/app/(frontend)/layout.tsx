import type { Metadata, Viewport } from 'next'
import { Manrope, Playfair_Display } from 'next/font/google'
import React from 'react'

import './globals.css'
import { websiteJsonLd, organizationJsonLd } from '../../lib/jsonLd'
import { SITE_DESC, SITE_URL } from '../../lib/site'
import { Analytics, analyticsEnabled } from './components/Analytics'
import { ConsentNotice } from './components/ConsentNotice'
import { JsonLd } from './components/JsonLd'
import { ServiceWorkerRegister } from './components/ServiceWorkerRegister'
import { SiteChrome } from './components/SiteChrome'
import { AdminModeProvider } from './components/edit/AdminMode'
import { EditToolbar } from './components/edit/EditToolbar'

// Шрифты self-hosted при сборке (кириллица). Переменные вешаем на <html> —
// читаются в CSS как var(--font-display)/var(--font-body). Админку (payload)
// не задевают: переменные только на фронтовом <html>.
const display = Playfair_Display({
  subsets: ['cyrillic', 'latin'],
  weight: ['700', '800', '900'],
  display: 'swap',
  variable: '--font-display',
})
const body = Manrope({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
})

// metadataBase делает относительный /og.jpg абсолютным URL для соц-скрейперов.
// URL/описание — единый источник lib/site.ts (боевой URL бейкается из env).

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Сабантуй Малмыж',
  description: SITE_DESC,
  // I9 — OG/Twitter card: при шеринге ссылки в VK/Telegram/соцсетях показывается
  // брендовый баннер /og.jpg + заголовок + описание (генератор: src/seed/genOgImage.ts).
  // Канонический URL + hreflang (ru ↔ tt) — для корректной индексации двух локалей.
  alternates: {
    canonical: '/',
    languages: { 'ru-RU': '/', 'tt-RU': '/tt' },
  },
  openGraph: {
    title: 'Сабантуй Малмыж',
    description: SITE_DESC,
    url: '/',
    siteName: 'Сабантуй Малмыж',
    locale: 'ru_RU',
    alternateLocale: ['tt_RU'],
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Сабантуй Малмыж — народный праздник' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Сабантуй Малмыж',
    description: SITE_DESC,
    images: ['/og.jpg'],
  },
  // PWA (I10): apple-touch при «добавить на экран» в iOS; manifest Next впрыскивает
  // сам из app/manifest.ts. appleWebApp — полноэкранный режим на iOS.
  icons: { apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Сабантуй' },
}

// themeColor в Next 15 — отдельный viewport-экспорт (не в metadata).
export const viewport: Viewport = {
  themeColor: '#155c39',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <body>
        {/* Глобальная разметка Schema.org (сайт + организатор) — для Google и ИИ-выдачи */}
        <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
        <ServiceWorkerRegister />
        {/* On-site редактирование: провайдер режима оборачивает шапку (кнопка
            «Войти»), верхнюю панель редактора и контент (inline-редакторы). */}
        <AdminModeProvider>
          <EditToolbar />
          <SiteChrome>{children}</SiteChrome>
        </AdminModeProvider>
        {/* Плашку про аналитику показываем только если счётчики реально включены */}
        {analyticsEnabled && <ConsentNotice />}
        <Analytics />
      </body>
    </html>
  )
}
