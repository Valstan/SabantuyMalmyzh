import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'Сабантуй Малмыж',
  description: 'Сайт фестиваля «Сабантуй Малмыж»: расписание, галерея, регистрация.',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="site-header">
          <div className="container site-nav" style={{ padding: 0 }}>
            <Link className="site-brand" href="/">
              Сабантуй&nbsp;Малмыж
            </Link>
            <nav className="site-nav-links" aria-label="Основная навигация">
              <Link href="/">Расписание</Link>
              <Link href="/map">Карта</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
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
