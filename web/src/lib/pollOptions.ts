import type { Locale } from './i18n'

/**
 * Анонимный опрос «Любимое состязание Сабантуя». Варианты централизованы здесь —
 * используются и в select-поле коллекции poll-votes (ru, админка), и во фронт-
 * компоненте Poll. Значения (value) — enum в Postgres, не менять без миграции.
 * tt-черновик (I11): getPollOptions(locale)/pollQuestion(locale) — только подписи.
 */
export const POLL_QUESTION = 'Какое состязание на Сабантуе вам по душе?'
const POLL_QUESTION_TT = 'Сабантуйда сезгә кайсы ярыш ошый?'

export type PollOption = { value: string; label: string }

// Базовые (ru) — используются коллекцией PollVotes (select options, админка).
export const POLL_OPTIONS: PollOption[] = [
  { value: 'koresh', label: 'Көрәш — борьба на поясах' },
  { value: 'skachki', label: 'Конные скачки' },
  { value: 'stolb', label: 'Лазание на столб' },
  { value: 'meshki', label: 'Бои мешками на бревне' },
  { value: 'kanat', label: 'Перетягивание каната' },
  { value: 'motokross', label: 'Мотокросс' },
]

const POLL_LABELS_TT: Record<string, string> = {
  koresh: 'Көрәш — билбау көрәше',
  skachki: 'Ат чабышы',
  stolb: 'Баганага менү',
  meshki: 'Бүрәнәдә капчык сугышы',
  kanat: 'Аркан тарту',
  motokross: 'Мотокросс',
}

export const POLL_VALUES = POLL_OPTIONS.map((o) => o.value)

export const pollQuestion = (locale: Locale = 'ru'): string =>
  locale === 'tt' ? POLL_QUESTION_TT : POLL_QUESTION

export const getPollOptions = (locale: Locale = 'ru'): PollOption[] =>
  locale === 'tt'
    ? POLL_OPTIONS.map((o) => ({ value: o.value, label: POLL_LABELS_TT[o.value] ?? o.label }))
    : POLL_OPTIONS

export const pollLabel = (value: string, locale: Locale = 'ru'): string => {
  const opts = getPollOptions(locale)
  return opts.find((o) => o.value === value)?.label ?? value
}
