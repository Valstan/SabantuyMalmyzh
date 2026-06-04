// Типы объектов на карте фестиваля — единый источник подписей и иконок.
// Порядок ключей задаёт порядок групп в легенде на /map.
export const MAP_TYPE: Record<string, { label: string; icon: string }> = {
  stage: { label: 'Сцены и площадки', icon: '🎤' },
  food: { label: 'Еда и напитки', icon: '🍽️' },
  entrance: { label: 'Входы', icon: '🚪' },
  parking: { label: 'Парковка', icon: '🅿️' },
  wc: { label: 'Туалеты', icon: '🚻' },
  medical: { label: 'Медпункт', icon: '⛑️' },
  other: { label: 'Другое', icon: '📍' },
}

export const MAP_TYPE_ORDER = Object.keys(MAP_TYPE)

export const mapTypeMeta = (type?: string | null) =>
  (type && MAP_TYPE[type]) || MAP_TYPE.other
