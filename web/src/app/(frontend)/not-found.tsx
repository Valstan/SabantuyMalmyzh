import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Страница не найдена',
}

export default function NotFound() {
  return (
    <main className="container">
      <section className="not-found">
        <h1>404</h1>
        <p>Такой страницы нет. Возможно, она была перемещена или удалена.</p>
        <Link className="btn-primary" href="/">
          На главную
        </Link>
      </section>
    </main>
  )
}
