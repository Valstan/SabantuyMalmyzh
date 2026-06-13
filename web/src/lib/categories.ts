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

export const categoryLabel = (category?: string | null, locale: Locale = 'ru'): string => {
  if (!category) return ''
  const map = locale === 'tt' ? CATEGORY_LABELS_TT : CATEGORY_LABELS
  return map[category] ?? CATEGORY_LABELS[category] ?? category
}
