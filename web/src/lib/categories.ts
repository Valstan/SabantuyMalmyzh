// Категории событий — единый источник подписей (использует главная и детали события).
// Порядок ключей задаёт порядок чипов-фильтров на главной.
export const CATEGORY_LABELS: Record<string, string> = {
  concert: 'Концерт',
  sport: 'Спорт',
  food: 'Национальная кухня',
  kids: 'Детям',
  crafts: 'Ремёсла',
  ceremony: 'Церемония',
  other: 'Другое',
}

export const categoryLabel = (category?: string | null): string =>
  category ? (CATEGORY_LABELS[category] ?? category) : ''
