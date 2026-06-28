import type { Metadata } from 'next'

import { FotobitvaStatsView, fotobitvaMeta } from '../../_views/FotobitvaStatsView'

// /lenta/fotobitva — статистика игры «Фотобитва»: месячный рейтинг фото + история по
// месяцам. ISR force-static + revalidate (как /lenta): рейтинг считается на боксе из
// раундов, страница кэшируется, медиа браузер тянет напрямую с Object Storage.
export const dynamic = 'force-static'
export const revalidate = 60

export const metadata: Metadata = fotobitvaMeta('ru')

export default function FotobitvaPage() {
  return <FotobitvaStatsView locale="ru" />
}
