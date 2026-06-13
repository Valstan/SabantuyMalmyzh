import type { MotifName } from '../app/(frontend)/components/MotifIcon'
import type { Locale } from './i18n'

/**
 * Контент-aware декор прозовых страниц (Pages по slug): AI-фото-шапка (если есть),
 * мотив-медальон-fallback (для страниц без фото), акцентная тема и надзаголовок-
 * eyebrow по смыслу страницы. Используется PageView (общий для ru/tt).
 *
 * Прежние рисованные SVG-сцены (SceneIllustration) убраны (владелец: заменить
 * алгоритмическую графику на настоящие фото) — шапки с фото показывают сам кадр,
 * безфотовые страницы (faq/kontakty/privacy) — мотив-медальон до прихода фото.
 *
 * Иконки культ-разделов держим в синхроне с lib/cultureSections.tsx (там тот же
 * MotifName на каждый slug). Здесь добавлены служебные страницы (o-sabantuy и т.п.),
 * акцент и eyebrow.
 */
type DecorAccent = 'green' | 'crimson' | 'gold' | 'tint'

export type PageDecor = {
  icon: MotifName
  accent: DecorAccent
  eyebrow: string
  /** AI-фото-фон шапки: базовое имя в /decor/. null → мотив-медальон. */
  photo: PagePhoto | null
}

/** Базовое имя файлов web/public/decor/<base>-{lg,960}.{webp,jpg} + ширина lg-кадра. */
export type PagePhoto = { base: string; largeWidth: number }

type DecorDef = {
  icon: MotifName
  accent: DecorAccent
  eyebrow: { ru: string; tt: string }
  photo?: PagePhoto
}

const DECOR: Record<string, DecorDef> = {
  // ── Культурные разделы (иконки = lib/cultureSections.tsx) ──────────────────
  narody: {
    icon: 'peoples',
    accent: 'green',
    eyebrow: { ru: 'Дружба народов', tt: 'Халыклар дуслыгы' },
    photo: { base: 'page-narody', largeWidth: 1344 },
  },
  podvorya: {
    icon: 'house',
    accent: 'gold',
    eyebrow: { ru: 'Национальные дворы', tt: 'Милли йортлар' },
    photo: { base: 'page-podvorya', largeWidth: 1248 },
  },
  'istoriya-sabantuya': {
    icon: 'scroll',
    accent: 'gold',
    eyebrow: { ru: 'Из глубины веков', tt: 'Гасырлар тирәнлегеннән' },
    photo: { base: 'page-istoriya', largeWidth: 1536 },
  },
  maydan: {
    icon: 'koresh',
    accent: 'green',
    eyebrow: { ru: 'Состязания батыров', tt: 'Батырлар ярышы' },
    photo: { base: 'page-maydan', largeWidth: 1920 },
  },
  'detskiy-maydan': {
    icon: 'kids',
    accent: 'gold',
    eyebrow: { ru: 'Для самых маленьких', tt: 'Иң кечкенәләр өчен' },
    photo: { base: 'page-detskiy', largeWidth: 1248 },
  },
  kuhnya: {
    icon: 'cuisine',
    accent: 'green',
    eyebrow: { ru: 'Вкусы праздника', tt: 'Бәйрәм тәмнәре' },
    photo: { base: 'page-kuhnya', largeWidth: 1344 },
  },
  'kak-dobratsya': {
    icon: 'compass',
    accent: 'green',
    eyebrow: { ru: 'Дорога до Малмыжа', tt: 'Малмыжга юл' },
    photo: { base: 'page-doroga', largeWidth: 1248 },
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
    photo: { base: 'page-o-sabantuy', largeWidth: 1248 },
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

/** Декор для страницы по slug. Неизвестный slug → нейтральный fallback. */
export function getPageDecor(slug: string, locale: Locale = 'ru'): PageDecor {
  const def = DECOR[slug] ?? FALLBACK
  return {
    icon: def.icon,
    accent: def.accent,
    eyebrow: def.eyebrow[locale],
    photo: def.photo ?? null,
  }
}
