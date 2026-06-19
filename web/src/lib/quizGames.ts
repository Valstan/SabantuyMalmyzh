import type { Locale } from './i18n'

/**
 * Каталог игр-«угадаек». Набор игр живёт здесь (как cultureSections/pollOptions/quiz),
 * а ВОПРОСЫ владелец добавляет в /admin (поле «Игра» у вопроса). `/igra` — хаб-выбор
 * по этому списку, каждая игра играется на `/igra/<slug>`.
 *
 * ⚠️ `slug` = значение enum-поля `game` коллекции quiz-questions (Postgres enum) —
 * НЕ менять и не удалять без миграции. Базовые label/описания ru; tt — getter'ом
 * (tt-черновик I11, общая очередь на вычитку носителем).
 */
export type QuizGameAccent = 'green' | 'gold' | 'crimson' | 'tint'

export type QuizGameDef = {
  slug: string
  title: { ru: string; tt: string }
  description: { ru: string; tt: string }
  accent: QuizGameAccent
  icon: string // эмодзи-значок карточки хаба (без AI-картинок; декор кодом)
}

export const QUIZ_GAMES: QuizGameDef[] = [
  {
    slug: 'sabantuy',
    title: { ru: 'Знаток Сабантуя', tt: 'Сабантуй белгече' },
    description: {
      ru: 'Вопросы о Малмыжском крае и народном празднике — у каждого факта есть пояснение и источник.',
      tt: 'Малмыж төбәге һәм халык бәйрәме турында сораулар — һәр фактның аңлатмасы һәм чыганагы бар.',
    },
    accent: 'green',
    icon: '🏵️',
  },
  {
    slug: 'kartinki',
    title: { ru: 'Угадай по картинке', tt: 'Рәсем буенча тап' },
    description: {
      ru: 'Узнайте предмет, обычай или место праздника по фотографии. У каждого снимка — ссылка на источник.',
      tt: 'Бәйрәмнең әйберен, йоласын яки урынын фоторәсем буенча таныгыз. Һәр рәсемнең чыганагына сылтама бар.',
    },
    accent: 'gold',
    icon: '🖼️',
  },
]

export const QUIZ_GAME_VALUES = QUIZ_GAMES.map((g) => g.slug)
export const DEFAULT_QUIZ_GAME = 'sabantuy'

// Опции для select-поля коллекции (админка ru).
export const quizGameOptions = QUIZ_GAMES.map((g) => ({ label: g.title.ru, value: g.slug }))

export type QuizGameView = {
  slug: string
  title: string
  description: string
  accent: QuizGameAccent
  icon: string
}

export const getQuizGames = (locale: Locale = 'ru'): QuizGameView[] =>
  QUIZ_GAMES.map((g) => ({
    slug: g.slug,
    title: g.title[locale] ?? g.title.ru,
    description: g.description[locale] ?? g.description.ru,
    accent: g.accent,
    icon: g.icon,
  }))

export const findQuizGame = (slug: string, locale: Locale = 'ru'): QuizGameView | null =>
  getQuizGames(locale).find((g) => g.slug === slug) ?? null
