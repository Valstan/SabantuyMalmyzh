import type { Metadata } from 'next'

import type { Locale } from './i18n'
import { localeHref } from './localeHref'

// canonical + hreflang для страницы с ru/tt-зеркалом.
//
// Класс G312 (пул, 12.09): `alternates.canonical: '/'` в корневом layout.tsx
// наследуется КАЖДОЙ страницей, которая не задала свой — для робота все они
// «копии главной». У нас так было у девяти разделов (Вебмастер: 25 дублей
// description). Каждый meta-хелпер вида обязан звать это, а не полагаться на layout.
export const localeAlternates = (locale: Locale, path: string): NonNullable<Metadata['alternates']> => ({
  canonical: localeHref(locale, path),
  languages: { 'ru-RU': localeHref('ru', path), 'tt-RU': localeHref('tt', path) },
})
