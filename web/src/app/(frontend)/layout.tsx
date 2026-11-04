import type { Metadata, Viewport } from 'next'
import config from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import './globals.css'
import { websiteJsonLd, organizationJsonLd } from '../../lib/jsonLd'
import { SITE_DESC, SITE_URL } from '../../lib/site'
import { withRetry } from '../../lib/withRetry'
import type { ChromeContent } from './components/SiteChrome'
import { Analytics, analyticsEnabled } from './components/Analytics'
import { ConsentNotice } from './components/ConsentNotice'
import { JsonLd } from './components/JsonLd'
import { ServiceWorkerRegister } from './components/ServiceWorkerRegister'
import { SiteChrome } from './components/SiteChrome'
import { AdminModeProvider } from './components/edit/AdminMode'
import { EditToolbar } from './components/edit/EditToolbar'

// Шрифты — свои файлы: @font-face и переменные --font-display/--font-body объявлены
// в fonts.css (импортируется из globals.css). Раньше здесь стоял next/font/google —
// он ходил за шрифтами на fonts.googleapis.com **в момент сборки**, и 2026-11-01
// deploy-prod на этом упал. Админку (payload) не задевает: fonts.css живёт только
// во фронтовом дереве стилей.

// metadataBase делает относительный /og.jpg абсолютным URL для соц-скрейперов.
// URL/описание — единый источник lib/site.ts (боевой URL бейкается из env).

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Сабантуй в Малмыже',
  description: SITE_DESC,
  // I9 — OG/Twitter card: при шеринге ссылки в VK/Telegram/соцсетях показывается
  // брендовый баннер /og.jpg + заголовок + описание (генератор: src/seed/genOgImage.ts).
  // Канонический URL + hreflang (ru ↔ tt) — для корректной индексации двух локалей.
  alternates: {
    canonical: '/',
    languages: { 'ru-RU': '/', 'tt-RU': '/tt' },
  },
  openGraph: {
    title: 'Сабантуй в Малмыже',
    description: SITE_DESC,
    url: '/',
    siteName: 'Сабантуй в Малмыже',
    locale: 'ru_RU',
    alternateLocale: ['tt_RU'],
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Сабантуй в Малмыже — народный праздник' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Сабантуй в Малмыже',
    description: SITE_DESC,
    images: ['/og.jpg'],
  },
  // PWA (I10): apple-touch при «добавить на экран» в iOS; manifest Next впрыскивает
  // сам из app/manifest.ts. appleWebApp — полноэкранный режим на iOS.
  // favicon (тюльпан из PWA-набора): явный icons.icon — файл-конвенция app/icon.png
  // сама по себе линк в head не даёт, когда icons задан в metadata.
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Сабантуй' },
}

// themeColor в Next 15 — отдельный viewport-экспорт (не в metadata).
export const viewport: Viewport = {
  themeColor: '#155c39',
}

// Редактируемые тексты шапки/подвала (глобалы header/footer, on-site PR3) для ОБЕИХ
// локалей — layout единый на / и /tt, локаль выбирает SiteChrome из пути. Пусто/сбой
// (в т.ч. отсутствие таблиц в build-БД) → null → SiteChrome падает на код/i18n. ISR цел
// (это data-fetch, не headers/cookies).
async function getChrome(): Promise<ChromeContent> {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      const [hRu, hTt, fRu, fTt] = await Promise.all([
        payload.findGlobal({ slug: 'header', locale: 'ru', depth: 0 }),
        payload.findGlobal({ slug: 'header', locale: 'tt', depth: 0 }),
        payload.findGlobal({ slug: 'footer', locale: 'ru', depth: 0 }),
        payload.findGlobal({ slug: 'footer', locale: 'tt', depth: 0 }),
      ])
      const pack = (h: typeof hRu, f: typeof fRu) => ({
        brand: (h?.brand as string | null) ?? null,
        nav: (Array.isArray(h?.nav) ? h.nav : []).map((n) => ({ key: String(n.key), label: (n.label as string | null) ?? null })),
        copyright: (f?.copyright as string | null) ?? null,
      })
      return { ru: pack(hRu, fRu), tt: pack(hTt, fTt) }
    })
  } catch {
    return null
  }
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const chrome = await getChrome()
  return (
    <html lang="ru">
      {/* Preload шрифтов: next/font делал это сам, убрав его — делаем руками. Оба
          сабсета нужны на каждой странице: кириллица — текст, латиница — цифры и
          латинские названия. React поднимает <link> в <head>. */}
      <link rel="preload" as="font" type="font/woff2" href="/fonts/manrope-cyrillic.woff2" crossOrigin="anonymous" />
      <link rel="preload" as="font" type="font/woff2" href="/fonts/manrope-latin.woff2" crossOrigin="anonymous" />
      <link
        rel="preload"
        as="font"
        type="font/woff2"
        href="/fonts/playfair-display-cyrillic.woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        as="font"
        type="font/woff2"
        href="/fonts/playfair-display-latin.woff2"
        crossOrigin="anonymous"
      />
      <body>
        {/* Глобальная разметка Schema.org (сайт + организатор) — для Google и ИИ-выдачи */}
        <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
        <ServiceWorkerRegister />
        {/* On-site редактирование: провайдер режима оборачивает шапку (кнопка
            «Войти»), верхнюю панель редактора и контент (inline-редакторы). */}
        <AdminModeProvider>
          <EditToolbar />
          <SiteChrome chrome={chrome}>{children}</SiteChrome>
        </AdminModeProvider>
        {/* Плашку про аналитику показываем только если счётчики реально включены */}
        {analyticsEnabled && <ConsentNotice />}
        <Analytics />
      </body>
    </html>
  )
}
