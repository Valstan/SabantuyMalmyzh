import type { Metadata } from 'next'

import { LentaView, lentaMeta } from '../_views/LentaView'

// /lenta — «Народная лента» (UGC). Тело — _views/LentaView (ru/tt). force-static +
// revalidate: медиа в Object Storage (браузер грузит напрямую), наш бокс отдаёт лёгкий
// кэшированный HTML; новое видно ≤30с (паттерн ISR анонс-страницы #145).
export const dynamic = 'force-static'
export const revalidate = 30

export const metadata: Metadata = lentaMeta('ru')

export default function LentaPage() {
  return <LentaView locale="ru" />
}
