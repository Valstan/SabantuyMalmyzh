import type { MotifName } from '../app/(frontend)/components/MotifIcon'
import type { SceneName } from '../app/(frontend)/components/SceneIllustration'
import type { Locale } from './i18n'

/**
 * Контент-aware декор прозовых страниц (Pages по slug): тематическая
 * фолк-иллюстрация (SceneIllustration), мотив-иконка-fallback, акцентная тема и
 * надзаголовок-eyebrow подбираются по смыслу страницы. Используется PageView
 * (общий для ru/tt) — закрывает директиву brain «ни одной сухой страницы»:
 * у каждой страницы крупная иллюстрация по смыслу + орнамент-слой.
 *
 * Иконки культ-разделов держим в синхроне с lib/cultureSections.tsx (там тот же
 * MotifName на каждый slug). Здесь добавлены служебные страницы (o-sabantuy и т.п.),
 * сцена-иллюстрация, акцент и eyebrow.
 */
export type DecorAccent = 'green' | 'crimson' | 'gold' | 'tint'

export type PageDecor = {
  icon: MotifName
  /** Тематическая иллюстрация по смыслу (R3). null → крупный мотив-медальон. */
  scene: SceneName | null
  accent: DecorAccent
  eyebrow: string
}

type DecorDef = {
  icon: MotifName
  scene: SceneName | null
  accent: DecorAccent
  eyebrow: { ru: string; tt: string }
}

const DECOR: Record<string, DecorDef> = {
  // ── Культурные разделы (иконки = lib/cultureSections.tsx) ──────────────────
  narody: {
    icon: 'peoples',
    scene: 'peoples',
    accent: 'green',
    eyebrow: { ru: 'Дружба народов', tt: 'Халыклар дуслыгы' },
  },
  podvorya: {
    icon: 'house',
    scene: 'house',
    accent: 'gold',
    eyebrow: { ru: 'Национальные дворы', tt: 'Милли йортлар' },
  },
  'istoriya-sabantuya': {
    icon: 'scroll',
    scene: 'plough',
    accent: 'crimson',
    eyebrow: { ru: 'Из глубины веков', tt: 'Гасырлар тирәнлегеннән' },
  },
  maydan: {
    icon: 'koresh',
    scene: 'wrestling',
    accent: 'green',
    eyebrow: { ru: 'Состязания батыров', tt: 'Батырлар ярышы' },
  },
  'detskiy-maydan': {
    icon: 'kids',
    scene: 'kids',
    accent: 'gold',
    eyebrow: { ru: 'Для самых маленьких', tt: 'Иң кечкенәләр өчен' },
  },
  kuhnya: {
    icon: 'cuisine',
    scene: 'feast',
    accent: 'crimson',
    eyebrow: { ru: 'Вкусы праздника', tt: 'Бәйрәм тәмнәре' },
  },
  'kak-dobratsya': {
    icon: 'compass',
    scene: 'road',
    accent: 'green',
    eyebrow: { ru: 'Дорога до Малмыжа', tt: 'Малмыжга юл' },
  },
  faq: {
    icon: 'question',
    scene: 'faq',
    accent: 'tint',
    eyebrow: { ru: 'Памятка гостю', tt: 'Кунакка хәтерләтмә' },
  },

  // ── Служебные / контентные страницы ───────────────────────────────────────
  'o-sabantuy': {
    icon: 'tulip',
    scene: 'celebration',
    accent: 'green',
    eyebrow: { ru: 'О фестивале', tt: 'Фестиваль турында' },
  },
  kontakty: {
    icon: 'compass',
    scene: 'contact',
    accent: 'gold',
    eyebrow: { ru: 'Свяжитесь с нами', tt: 'Безнең белән бәйләнешегез' },
  },
  privacy: {
    icon: 'scroll',
    scene: 'document',
    accent: 'tint',
    eyebrow: { ru: 'Правовая информация', tt: 'Хокукый мәгълүмат' },
  },
}

const FALLBACK: DecorDef = {
  icon: 'tulip',
  scene: 'celebration',
  accent: 'tint',
  eyebrow: { ru: 'Сабантуй Малмыж', tt: 'Сабантуй Малмыж' },
}

/** Декор для страницы по slug. Неизвестный slug → нейтральный fallback. */
export function getPageDecor(slug: string, locale: Locale = 'ru'): PageDecor {
  const def = DECOR[slug] ?? FALLBACK
  return { icon: def.icon, scene: def.scene, accent: def.accent, eyebrow: def.eyebrow[locale] }
}
