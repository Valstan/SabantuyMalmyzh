import type { Metadata } from 'next'

import { CreditsView, creditsMeta } from '../_views/CreditsView'

// /istochniki-foto — атрибуция свободных фото (Wikimedia Commons) одной страницей.
// Полностью статична (данные — const в lib/imageCredits.ts).
export const metadata: Metadata = creditsMeta('ru')

export default function CreditsPage() {
  return <CreditsView locale="ru" />
}
