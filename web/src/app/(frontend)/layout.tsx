import type { Metadata } from 'next'
import { Manrope, Playfair_Display } from 'next/font/google'
import Link from 'next/link'
import React from 'react'

import './globals.css'
import { SectionDivider } from './components/SectionDivider'
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

export const metadata: Metadata = {
  title: 'Сабантуй Малмыж',
  description: 'Сайт фестиваля «Сабантуй Малмыж»: расписание, галерея, регистрация.',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <body>
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
