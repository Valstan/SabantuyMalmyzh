import type { Metadata, Viewport } from 'next'
import { Manrope, Playfair_Display } from 'next/font/google'
import Link from 'next/link'
import React from 'react'

import './globals.css'
import { SectionDivider } from './components/SectionDivider'
import { ServiceWorkerRegister } from './components/ServiceWorkerRegister'
import { CULTURE_SECTIONS } from '../../lib/cultureSections'

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
// Берём боевой URL из env (бейкается при сборке), с разумным фолбэком.
const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://1942c6fc87be.vps.myjino.ru'
const SITE_DESC = 'Народный праздник Малмыжа — труда, силы и дружбы народов. Программа, галерея, история и традиции Сабантуя.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Сабантуй Малмыж',
  description: SITE_DESC,
  // I9 — OG/Twitter card: при шеринге ссылки в VK/Telegram/соцсетях показывается
  // брендовый баннер /og.jpg + заголовок + описание (генератор: src/seed/genOgImage.ts).
  openGraph: {
    title: 'Сабантуй Малмыж',
    description: SITE_DESC,
    url: '/',
    siteName: 'Сабантуй Малмыж',
    locale: 'ru_RU',
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
        <ServiceWorkerRegister />
        <header className="site-header">
          <div className="container site-nav" style={{ padding: 0 }}>
            <Link className="site-brand" href="/">
              Сабантуй&nbsp;Малмыж
            </Link>
            <nav className="site-nav-links" aria-label="Основная навигация">
              <Link href="/">Расписание</Link>
              <Link href="/gallery">Галерея</Link>
              <Link href="/map">Карта</Link>
              <Link href="/o-sabantuy">О фестивале</Link>
              <Link href="/kontakty">Контакты</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <nav className="footer-nav" aria-label="Разделы сайта">
            <Link href="/">Расписание</Link>
            <Link href="/gallery">Галерея</Link>
            <Link href="/map">Карта</Link>
            <Link href="/o-sabantuy">О фестивале</Link>
            {CULTURE_SECTIONS.map((s) => (
              <Link key={s.href} href={s.href}>
                {s.title}
              </Link>
            ))}
            <Link href="/kontakty">Контакты</Link>
          </nav>
          <div style={{ maxWidth: 220, margin: '0 auto 0.85rem' }}>
            <SectionDivider variant="vine" />
          </div>
          © Сабантуй Малмыж ·{' '}
          <Link href="/privacy" prefetch={false}>
            Политика обработки ПДн
          </Link>{' '}
          ·{' '}
          <Link href="/admin" prefetch={false}>
            админка
          </Link>
        </footer>
      </body>
    </html>
  )
}
