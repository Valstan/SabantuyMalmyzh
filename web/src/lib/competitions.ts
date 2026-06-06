// Дисциплины майдана для регистрации участников (идея I5).
// Единый источник: используют коллекция Registrations (select-опции), форма заявки
// и страница события. Значения — ASCII-транслит (как enum опроса poll_votes; кириллица
// в значениях enum/CLI бьётся — G11), метки — по-русски.
//
// Показываем селектор дисциплины на форме, когда событие — состязание
// (category 'sport' или 'kids'); см. COMPETITION_CATEGORIES.
export const COMPETITIONS: { value: string; label: string }[] = [
  { value: 'koresh', label: 'Куреш (борьба на поясах)' },
  { value: 'skachki', label: 'Конные скачки' },
  { value: 'meshki', label: 'Бой мешками на бревне' },
  { value: 'beg_v_meshkah', label: 'Бег в мешках' },
  { value: 'kanat', label: 'Перетягивание каната' },
  { value: 'girya', label: 'Поднятие гири' },
  { value: 'stolb', label: 'Лазание на столб' },
  { value: 'kids', label: 'Детские состязания' },
]

export const COMPETITION_VALUES = COMPETITIONS.map((c) => c.value)

export const competitionLabel = (value?: string | null): string =>
  value ? (COMPETITIONS.find((c) => c.value === value)?.label ?? value) : ''

// Категории событий, для которых на форме показываем выбор дисциплины.
export const COMPETITION_CATEGORIES = ['sport', 'kids']

export const isCompetitionCategory = (category?: string | null): boolean =>
  !!category && COMPETITION_CATEGORIES.includes(category)
