import type { Metadata } from 'next'

import { EfirView, efirMeta } from '../_views/EfirView'

// /efir — прямой эфир (VK Live embed). Тело — _views/EfirView (ru/tt). ISR: плеер
// появляется/исчезает по тумблеру в /admin (revalidateLiveStream — мгновенно).
export const revalidate = 30

export const metadata: Metadata = efirMeta('ru')

export default function EfirPage() {
  return <EfirView locale="ru" />
}
