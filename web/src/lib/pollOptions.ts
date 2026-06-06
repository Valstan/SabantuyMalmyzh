/**
 * Анонимный опрос «Любимое состязание Сабантуя». Варианты централизованы здесь
 * (как categories.ts) — используются и в select-поле коллекции poll-votes, и во
 * фронт-компоненте Poll. Значения (value) становятся enum в Postgres — менять
 * существующие осторожно (потребует миграции).
 */
export const POLL_QUESTION = 'Какое состязание на Сабантуе вам по душе?'

export type PollOption = { value: string; label: string }

export const POLL_OPTIONS: PollOption[] = [
  { value: 'koresh', label: 'Көрәш — борьба на поясах' },
  { value: 'skachki', label: 'Конные скачки' },
  { value: 'stolb', label: 'Лазание на столб' },
  { value: 'meshki', label: 'Бои мешками на бревне' },
  { value: 'kanat', label: 'Перетягивание каната' },
  { value: 'motokross', label: 'Мотокросс' },
]

export const POLL_VALUES = POLL_OPTIONS.map((o) => o.value)
export const pollLabel = (value: string): string =>
  POLL_OPTIONS.find((o) => o.value === value)?.label ?? value
