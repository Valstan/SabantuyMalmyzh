import type { Metadata } from 'next'
import Link from 'next/link'

import { MotifIcon } from './components/MotifIcon'

export const metadata: Metadata = {
  title: 'Страница не найдена',
}

export default function NotFound() {
  return (
    <main className="container">
      <section className="not-found">
        <span className="feature-icon" style={{ margin: '0 auto 1.25rem' }}>
          <MotifIcon name="tulip" />
        </span>
        <h1>404</h1>
        <p>Такой страницы нет. Возможно, она была перемещена или удалена.</p>
        <Link className="btn btn-gold" href="/">
          На главную
        </Link>
      </section>
    </main>
  )
}
