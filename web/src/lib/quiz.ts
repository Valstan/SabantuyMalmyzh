import type { Locale } from './i18n'

/**
 * Конфиг познавательной игры-«угадайки» (директива brain 2026-06-18).
 *
 * Темы / типы / сложности централизованы здесь: значения (value) — это enum в
 * Postgres (select-поля коллекции quiz-questions), НЕ менять без миграции. Базовые
 * label — ru (используются в админке). Для фронта — локализованные getter'ы
 * (tt-подписи, как у pollOptions/categories; tt-черновик I11).
 *
 * Звания (RANKS) — мягкая геймификация: по доле верных ответов игрок получает
 * титул. Хранение прогресса — localStorage на клиенте, без БД и аккаунтов.
 */

export type QuizOption = { value: string; label: string }

// ─── Темы вопросов (краеведение + праздник) ──────────────────────────────────
export const QUIZ_THEMES: QuizOption[] = [
  { value: 'sabantuy', label: 'Праздник Сабантуй' },
  { value: 'history', label: 'История края' },
  { value: 'geography', label: 'Природа и география' },
  { value: 'people', label: 'Народы и быт' },
  { value: 'language', label: 'Татарский язык' },
  { value: 'other', label: 'Разное' },
]

const QUIZ_THEMES_TT: Record<string, string> = {
  sabantuy: 'Сабантуй бәйрәме',
  history: 'Төбәк тарихы',
  geography: 'Табигать һәм география',
  people: 'Халыклар һәм көнкүреш',
  language: 'Татар теле',
  other: 'Төрле',
}

// ─── Тип вопроса (только оформление/подпись; механика общая) ──────────────────
export const QUIZ_FORMATS: QuizOption[] = [
  { value: 'choice', label: 'Вопрос с вариантами' },
  { value: 'trueMyth', label: 'Правда или миф' },
  { value: 'translate', label: 'Переведи слово' },
]

const QUIZ_FORMATS_TT: Record<string, string> = {
  choice: 'Вариантлы сорау',
  trueMyth: 'Дөрес яки ялган',
  translate: 'Сүзне тәрҗемә ит',
}

// ─── Сложность (для подписи и подсчёта) ──────────────────────────────────────
export const QUIZ_DIFFICULTIES: QuizOption[] = [
  { value: 'easy', label: 'Лёгкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'hard', label: 'Сложный' },
]

const QUIZ_DIFFICULTIES_TT: Record<string, string> = {
  easy: 'Җиңел',
  medium: 'Урта',
  hard: 'Авыр',
}

const localized = (
  base: QuizOption[],
  tt: Record<string, string>,
  locale: Locale,
): QuizOption[] =>
  locale === 'tt' ? base.map((o) => ({ value: o.value, label: tt[o.value] ?? o.label })) : base

export const getQuizThemes = (locale: Locale = 'ru'): QuizOption[] =>
  localized(QUIZ_THEMES, QUIZ_THEMES_TT, locale)
export const getQuizFormats = (locale: Locale = 'ru'): QuizOption[] =>
  localized(QUIZ_FORMATS, QUIZ_FORMATS_TT, locale)
export const getQuizDifficulties = (locale: Locale = 'ru'): QuizOption[] =>
  localized(QUIZ_DIFFICULTIES, QUIZ_DIFFICULTIES_TT, locale)

export const quizThemeLabel = (value: string | null | undefined, locale: Locale = 'ru'): string =>
  getQuizThemes(locale).find((t) => t.value === value)?.label ?? ''

// ─── Звания по результату ────────────────────────────────────────────────────
// minRatio — нижний порог доли верных ответов (по убыванию). title/blurb ru/tt.
export type QuizRank = {
  minRatio: number
  title: { ru: string; tt: string }
  blurb: { ru: string; tt: string }
}

export const QUIZ_RANKS: QuizRank[] = [
  {
    minRatio: 1,
    title: { ru: 'Аксакал Сабантуя', tt: 'Сабантуй аксакалы' },
    blurb: {
      ru: 'Безупречно! Вы знаете малмыжскую землю как родную.',
      tt: 'Камил! Сез Малмыж җирен туган итеп беләсез.',
    },
  },
  {
    minRatio: 0.8,
    title: { ru: 'Знаток Сабантуя', tt: 'Сабантуй белгече' },
    blurb: {
      ru: 'Отличный результат — вы настоящий знаток края.',
      tt: 'Шәп нәтиҗә — сез чын төбәк белгече.',
    },
  },
  {
    minRatio: 0.5,
    title: { ru: 'Батыр майдана', tt: 'Мәйдан батыры' },
    blurb: {
      ru: 'Хорошо! Половина пути к званию знатока пройдена.',
      tt: 'Яхшы! Белгеч исеменә юлның яртысы үтелде.',
    },
  },
  {
    minRatio: 0,
    title: { ru: 'Гость майдана', tt: 'Мәйдан кунагы' },
    blurb: {
      ru: 'Начало положено — попробуйте ещё раз и узнаете больше!',
      tt: 'Башы салынды — тагын бер тапкыр карагыз, күбрәк белерсез!',
    },
  },
]

export const getQuizRank = (correct: number, total: number): QuizRank => {
  const ratio = total > 0 ? correct / total : 0
  return QUIZ_RANKS.find((r) => ratio >= r.minRatio) ?? QUIZ_RANKS[QUIZ_RANKS.length - 1]
}
