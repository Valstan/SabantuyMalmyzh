import type { Metadata } from 'next'

import { OtschetView, otschetMeta } from '../_views/OtschetView'

// «Сколько осталось до Сабантуя» — шаримая страница живого отсчёта. ISR:
// цель отсчёта (ближайшее событие) меняется редко, сам отсчёт тикает на клиенте.
export const revalidate = 300

export const metadata: Metadata = otschetMeta('ru')

export default function OtschetPage() {
  return <OtschetView locale="ru" />
}
