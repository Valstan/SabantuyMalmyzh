import { DEFAULT_LOCALE, isLocale, type Locale } from './i18n'

// Путевая i18n-схема: русский (default) — без префикса (/, /map, /events/x),
// татарский — с префиксом /tt (/tt, /tt/map, /tt/events/x).
//
// localeHref(locale, '/map') → '/map' (ru) | '/tt/map' (tt).
// pathLocale('/tt/map')      → 'tt';  pathLocale('/map') → 'ru'.
// stripLocale('/tt/map')     → '/map' (путь без локали-префикса).

export function localeHref(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (locale === DEFAULT_LOCALE) return clean
  // tt: префикс /tt; корень '/' → '/tt'
  return clean === '/' ? '/tt' : `/tt${clean}`
}

export function pathLocale(pathname: string): Locale {
  const seg = pathname.split('/').filter(Boolean)[0]
  return isLocale(seg) && seg !== DEFAULT_LOCALE ? (seg as Locale) : DEFAULT_LOCALE
}

export function stripLocale(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] && isLocale(parts[0]) && parts[0] !== DEFAULT_LOCALE) {
    const rest = '/' + parts.slice(1).join('/')
    return rest === '/' ? '/' : rest.replace(/\/$/, '')
  }
  return pathname || '/'
}
