import type { Locale } from './i18n'

// Категории событий — единый источник подписей. CATEGORY_LABELS (ru) используют
// чипы-фильтры/бейджи; categoryLabel(cat, locale) даёт перевод (tt-черновик, I11).
export const CATEGORY_LABELS: Record<string, string> = {
  concert: 'Концерт',
  sport: 'Спорт',
  food: 'Национальная кухня',
  kids: 'Детям',
  crafts: 'Ремёсла',
  ceremony: 'Церемония',
  other: 'Другое',
}

const CATEGORY_LABELS_TT: Record<string, string> = {
  concert: 'Концерт',
  sport: 'Спорт',
  food: 'Милли аш',
  kids: 'Балаларга',
  crafts: 'Һөнәрләр',
  ceremony: 'Тантана',
  other: 'Башка',
}

/** Категория → базовый slug обложки-миниатюры в web/public/decor/ (карточки расписания). */
export const CATEGORY_COVER: Record<string, string> = {
  concert: 'feat-concert',
  sport: 'feat-koresh',
  food: 'feat-cuisine',
  kids: 'feat-kids',
  ceremony: 'cat-ceremony',
  crafts: 'card-podvorya',
}

/**
 * Точечные обложки для конкретных событий программы (slug → базовый slug в
 * /decor) — поверх категорийного дефолта: у категории «Спорт» 7 разных пунктов
 * (волейбол, скачки, футбол…), одна картинка кореша на всех не годится.
 * feat-volleyball/football/gift/mosque — свободные фото Wikimedia Commons,
 * авторы и лицензии — lib/imageCredits.ts (страница /istochniki-foto).
 */
export const EVENT_COVER: Record<string, string> = {
  'p2026-voleybol': 'feat-volleyball',
  'p2026-konnye-zabegi': 'feat-horse',
  'p2026-skachki': 'feat-horse',
  'p2026-dua': 'feat-mosque',
  'p2026-skazka-tukay': 'card-detskiy',
  'p2026-sostyazaniya': 'feat-pole',
  'p2026-mini-futbol': 'feat-football',
  'p2026-futbol': 'feat-football',
  'p2026-rozygrysh': 'feat-gift',
}

export const categoryLabel = (category?: string | null, locale: Locale = 'ru'): string => {
  if (!category) return ''
  const map = locale === 'tt' ? CATEGORY_LABELS_TT : CATEGORY_LABELS
  return map[category] ?? CATEGORY_LABELS[category] ?? category
}
