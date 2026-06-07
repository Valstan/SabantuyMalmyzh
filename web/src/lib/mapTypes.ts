import type { Locale } from './i18n'

// Типы объектов на карте фестиваля — единый источник подписей и иконок.
// MAP_TYPE (ru) — порядок групп в легенде; mapTypeMeta(type, locale) даёт перевод
// метки (tt-черновик, I11). Иконки общие.
export const MAP_TYPE: Record<string, { label: string; icon: string }> = {
  stage: { label: 'Сцены и площадки', icon: '🎤' },
  food: { label: 'Еда и напитки', icon: '🍽️' },
  entrance: { label: 'Входы', icon: '🚪' },
  parking: { label: 'Парковка', icon: '🅿️' },
  wc: { label: 'Туалеты', icon: '🚻' },
  medical: { label: 'Медпункт', icon: '⛑️' },
  other: { label: 'Другое', icon: '📍' },
}

const MAP_TYPE_LABELS_TT: Record<string, string> = {
  stage: 'Сәхнәләр һәм мәйданчыклар',
  food: 'Ашау-эчү',
  entrance: 'Керешләр',
  parking: 'Машина туктату',
  wc: 'Бәдрәфләр',
  medical: 'Медпункт',
  other: 'Башка',
}

export const MAP_TYPE_ORDER = Object.keys(MAP_TYPE)

export const mapTypeMeta = (type?: string | null, locale: Locale = 'ru') => {
  const base = (type && MAP_TYPE[type]) || MAP_TYPE.other
  if (locale === 'tt') {
    const ttLabel = (type && MAP_TYPE_LABELS_TT[type]) || MAP_TYPE_LABELS_TT.other
    return { label: ttLabel, icon: base.icon }
  }
  return base
}
