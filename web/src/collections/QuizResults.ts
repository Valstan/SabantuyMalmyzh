import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { anyone } from '../access/anyone'
import { rateLimitQuizResult } from '../hooks/rateLimitQuizResult'

// Обезличенные результаты прохождения игры-угадайки. Одна строка = одно
// завершённое прохождение: сколько верных ответов (score) из скольких вопросов
// (total). Без PII, без аккаунтов — на сайте показывается только агрегат
// (общее число игроков, средний балл, распределение по баллам).
//
// ⚠️ pool #015: create — публичный (игрок завершил игру), read/update/delete —
// только персонал. Результаты не PII, но read закрыт, чтобы их нельзя было
// перечислять/скрейпить через публичный API; итог отдаёт сервер (overrideAccess)
// агрегатом, без отдельных строк. «Один результат на браузер» обеспечивает
// localStorage на фронте, а серверный rate-limit отсекает грубый спам (как у
// PollVotes). Хук дополнительно валидирует целостность (0 ≤ score ≤ total).
export const QuizResults: CollectionConfig<'quiz-results'> = {
  slug: 'quiz-results',
  labels: {
    singular: 'Результат игры',
    plural: 'Результаты игры',
  },
  access: {
    create: anyone,
    read: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['score', 'total', 'createdAt'],
    description:
      'Обезличенные результаты игры-угадайки. На сайте — агрегат (счётчик игроков, средний балл, распределение).',
  },
  fields: [
    {
      name: 'score',
      type: 'number',
      label: 'Верных ответов',
      required: true,
      min: 0,
    },
    {
      name: 'total',
      type: 'number',
      label: 'Всего вопросов',
      required: true,
      min: 1,
    },
    {
      // К какой игре относится результат (slug из lib/quizGames). Текст, не enum —
      // не связываем со схемой игр. Пусто = ранние результаты (игра «Знаток Сабантуя»).
      name: 'game',
      type: 'text',
      label: 'Игра',
      admin: { description: 'Slug игры. Пусто — ранние результаты (Знаток Сабантуя).' },
    },
  ],
  hooks: {
    beforeValidate: [rateLimitQuizResult],
  },
  timestamps: true,
}
