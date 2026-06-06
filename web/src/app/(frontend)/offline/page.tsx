import type { Metadata } from 'next'
import Link from 'next/link'

import { MotifIcon } from '../components/MotifIcon'

/**
 * Офлайн-фолбэк (PWA, идея I10): отдаётся service worker'ом, когда страница
 * запрошена без сети и её ещё нет в кэше. Статическая, не требует данных.
 */
export const metadata: Metadata = {
  title: 'Нет соединения',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <main className="container">
      <section className="not-found">
        <span className="feature-icon" style={{ margin: '0 auto 1.25rem' }}>
          <MotifIcon name="tulip" />
        </span>
        <h1>Нет соединения</h1>
        <p>
          Похоже, интернет пропал — на майдане это обычное дело. Уже открытые
          страницы (программа, карта) остаются доступны без сети. Как только
          соединение вернётся, всё обновится само.
        </p>
        <Link className="btn btn-gold" href="/">
          На главную
        </Link>
      </section>
    </main>
  )
}
