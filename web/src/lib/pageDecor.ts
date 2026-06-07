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
}

type DecorDef = {
  icon: MotifName
  accent: DecorAccent
  eyebrow: { ru: string; tt: string }
}

const DECOR: Record<string, DecorDef> = {
  // ── Культурные разделы (иконки = lib/cultureSections.tsx) ──────────────────
  narody: {
    icon: 'peoples',
    accent: 'green',
    eyebrow: { ru: 'Дружба народов', tt: 'Халыклар дуслыгы' },
  },
  podvorya: {
    icon: 'house',
    accent: 'gold',
    eyebrow: { ru: 'Национальные дворы', tt: 'Милли йортлар' },
  },
  'istoriya-sabantuya': {
    icon: 'scroll',
    accent: 'crimson',
    eyebrow: { ru: 'Из глубины веков', tt: 'Гасырлар тирәнлегеннән' },
  },
  maydan: {
    icon: 'koresh',
    accent: 'green',
    eyebrow: { ru: 'Состязания батыров', tt: 'Батырлар ярышы' },
  },
  'detskiy-maydan': {
    icon: 'kids',
    accent: 'gold',
    eyebrow: { ru: 'Для самых маленьких', tt: 'Иң кечкенәләр өчен' },
  },
  kuhnya: {
    icon: 'cuisine',
    accent: 'crimson',
    eyebrow: { ru: 'Вкусы праздника', tt: 'Бәйрәм тәмнәре' },
  },
  'kak-dobratsya': {
    icon: 'compass',
    accent: 'green',
    eyebrow: { ru: 'Дорога до Малмыжа', tt: 'Малмыжга юл' },
  },
  faq: {
    icon: 'question',
    accent: 'tint',
    eyebrow: { ru: 'Памятка гостю', tt: 'Кунакка хәтерләтмә' },
  },

  // ── Служебные / контентные страницы ───────────────────────────────────────
  'o-sabantuy': {
    icon: 'tulip',
    accent: 'green',
    eyebrow: { ru: 'О фестивале', tt: 'Фестиваль турында' },
  },
  kontakty: {
    icon: 'compass',
    accent: 'gold',
    eyebrow: { ru: 'Свяжитесь с нами', tt: 'Безнең белән бәйләнешегез' },
  },
  privacy: {
    icon: 'scroll',
    accent: 'tint',
    eyebrow: { ru: 'Правовая информация', tt: 'Хокукый мәгълүмат' },
  },
}

const FALLBACK: DecorDef = {
  icon: 'tulip',
  accent: 'tint',
  eyebrow: { ru: 'Сабантуй Малмыж', tt: 'Сабантуй Малмыж' },
}

/** Декор для страницы по slug. Неизвестный slug → нейтральный тюльпан-fallback. */
export function getPageDecor(slug: string, locale: Locale = 'ru'): PageDecor {
  const def = DECOR[slug] ?? FALLBACK
  return { icon: def.icon, accent: def.accent, eyebrow: def.eyebrow[locale] }
}
