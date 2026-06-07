import type { MotifName } from '../app/(frontend)/components/MotifIcon'
import type { Locale } from './i18n'

/**
 * Контент-aware декор прозовых страниц (Pages по slug): мотив-иконка, акцентная
 * тема и надзаголовок-eyebrow подбираются по смыслу страницы. Используется
 * PageView (общий для ru/tt) — закрывает директиву brain «ни одной сухой страницы»:
 * у каждой страницы минимум орнамент-слой (иконка-медальон + текстура + мазок).
 *
 * Иконки культ-разделов держим в синхроне с lib/cultureSections.tsx (там тот же
 * MotifName на каждый slug). Здесь добавлены служебные страницы (o-sabantuy и т.п.)
 * и акцент/eyebrow, которых в cultureSections нет.
 */
export type DecorAccent = 'green' | 'crimson' | 'gold' | 'tint'

export type PageDecor = {
  icon: MotifName
  accent: DecorAccent
  eyebrow: string
  /**
   * Индекс кадра в featured-альбоме галереи для фона шапки (R2, реальные фото).
   * null → только орнамент-слой (служебные/правовые страницы, где фото не по
   * смыслу). PageView подставляет реальный URL и берёт модуль по длине альбома.
   */
  photo: number | null
}

type DecorDef = {
  icon: MotifName
  accent: DecorAccent
  eyebrow: { ru: string; tt: string }
  photo: number | null
}

const DECOR: Record<string, DecorDef> = {
  // ── Культурные разделы (иконки = lib/cultureSections.tsx) ──────────────────
  narody: {
    icon: 'peoples',
    accent: 'green',
    eyebrow: { ru: 'Дружба народов', tt: 'Халыклар дуслыгы' },
    photo: 1,
  },
  podvorya: {
    icon: 'house',
    accent: 'gold',
    eyebrow: { ru: 'Национальные дворы', tt: 'Милли йортлар' },
    photo: 2,
  },
  'istoriya-sabantuya': {
    icon: 'scroll',
    accent: 'crimson',
    eyebrow: { ru: 'Из глубины веков', tt: 'Гасырлар тирәнлегеннән' },
    photo: 6,
  },
  maydan: {
    icon: 'koresh',
    accent: 'green',
    eyebrow: { ru: 'Состязания батыров', tt: 'Батырлар ярышы' },
    photo: 3,
  },
  'detskiy-maydan': {
    icon: 'kids',
    accent: 'gold',
    eyebrow: { ru: 'Для самых маленьких', tt: 'Иң кечкенәләр өчен' },
    photo: 4,
  },
  kuhnya: {
    icon: 'cuisine',
    accent: 'crimson',
    eyebrow: { ru: 'Вкусы праздника', tt: 'Бәйрәм тәмнәре' },
    photo: 5,
  },
  // Информационные страницы — фото не по смыслу, остаётся орнамент-слой.
  'kak-dobratsya': {
    icon: 'compass',
    accent: 'green',
    eyebrow: { ru: 'Дорога до Малмыжа', tt: 'Малмыжга юл' },
    photo: null,
  },
  faq: {
    icon: 'question',
    accent: 'tint',
    eyebrow: { ru: 'Памятка гостю', tt: 'Кунакка хәтерләтмә' },
    photo: null,
  },

  // ── Служебные / контентные страницы ───────────────────────────────────────
  'o-sabantuy': {
    icon: 'tulip',
    accent: 'green',
    eyebrow: { ru: 'О фестивале', tt: 'Фестиваль турында' },
    photo: 0,
  },
  kontakty: {
    icon: 'compass',
    accent: 'gold',
    eyebrow: { ru: 'Свяжитесь с нами', tt: 'Безнең белән бәйләнешегез' },
    photo: null,
  },
  privacy: {
    icon: 'scroll',
    accent: 'tint',
    eyebrow: { ru: 'Правовая информация', tt: 'Хокукый мәгълүмат' },
    photo: null,
  },
}

const FALLBACK: DecorDef = {
  icon: 'tulip',
  accent: 'tint',
  eyebrow: { ru: 'Сабантуй Малмыж', tt: 'Сабантуй Малмыж' },
  photo: null,
}

/** Декор для страницы по slug. Неизвестный slug → нейтральный тюльпан-fallback. */
export function getPageDecor(slug: string, locale: Locale = 'ru'): PageDecor {
  const def = DECOR[slug] ?? FALLBACK
  return { icon: def.icon, accent: def.accent, eyebrow: def.eyebrow[locale], photo: def.photo }
}
