import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'
import { validateQuizQuestion } from '../hooks/validateQuizQuestion'
import { revalidateQuiz, revalidateQuizDelete } from '../hooks/revalidateQuiz'
import { QUIZ_DIFFICULTIES, QUIZ_FORMATS, QUIZ_THEMES } from '../lib/quiz'

// Познавательная игра-«угадайка» (директива brain 2026-06-18): игрок отгадывает
// факты о Малмыжском крае и празднике Сабантуй. Один гибкий механизм — викторина
// с выбором ответа — покрывает разные форматы (вопрос-варианты, «правда/миф»,
// «переведи слово») через поле `format`; разнообразие живёт в КОНТЕНТЕ, не в коде.
//
// ⚠️ Игра ОБРАЗОВАТЕЛЬНАЯ → факты обязаны быть проверяемыми. Поле `source`
// (источник) — не косметика: каждый факт можно сверить и отстоять. Поэтому
// коллекция версионируется (drafts): вопрос показывается публично только после
// публикации (фактчек до publish), как Events/Pages.
//
// pool #015: read=authenticatedOrPublished (гость видит только опубликованное),
// write=adminOrEditor (серверный access 1:1 с UI-гейтом; PII нет, но запись —
// только персонал). Прогресс игрока — в localStorage на клиенте, не в БД.
export const QuizQuestions: CollectionConfig<'quiz-questions'> = {
  slug: 'quiz-questions',
  labels: {
    singular: 'Вопрос игры',
    plural: 'Игра-угадайка',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: authenticatedOrPublished,
    update: adminOrEditor,
  },
  admin: {
    defaultColumns: ['prompt', 'theme', 'difficulty', '_status', 'updatedAt'],
    useAsTitle: 'prompt',
    description:
      'Вопросы познавательной игры-угадайки. Факт в «Пояснении» должен иметь проверяемый «Источник». Публикуется только после фактчека (черновик не виден на сайте).',
  },
  fields: [
    {
      name: 'prompt',
      type: 'text',
      label: 'Вопрос',
      required: true,
      localized: true,
    },
    {
      name: 'theme',
      type: 'select',
      label: 'Тема',
      defaultValue: 'sabantuy',
      options: QUIZ_THEMES.map((th) => ({ label: th.label, value: th.value })),
    },
    {
      name: 'format',
      type: 'select',
      label: 'Тип вопроса',
      defaultValue: 'choice',
      admin: {
        description: 'Влияет только на оформление/подпись; механика у всех — выбор варианта.',
      },
      options: QUIZ_FORMATS.map((f) => ({ label: f.label, value: f.value })),
    },
    {
      name: 'difficulty',
      type: 'select',
      label: 'Сложность',
      defaultValue: 'medium',
      admin: { position: 'sidebar' },
      options: QUIZ_DIFFICULTIES.map((d) => ({ label: d.label, value: d.value })),
    },
    {
      // Структура (число вариантов, какой верный) общая для всех языков —
      // переводится только ТЕКСТ варианта (localized-подполе), а не сам массив.
      // Так `correct` не нужно дублировать по локалям (by design, как у GONBA).
      name: 'options',
      type: 'array',
      label: 'Варианты ответа',
      required: true,
      minRows: 2,
      maxRows: 4,
      labels: { singular: 'Вариант', plural: 'Варианты' },
      admin: {
        description: 'От 2 до 4 вариантов. Ровно один отметьте как правильный.',
      },
      fields: [
        {
          name: 'text',
          type: 'text',
          label: 'Текст варианта',
          required: true,
          localized: true,
        },
        {
          name: 'correct',
          type: 'checkbox',
          label: 'Правильный ответ',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'explanation',
      type: 'textarea',
      label: 'Пояснение (познавательный факт)',
      localized: true,
      admin: {
        description: 'Показывается после ответа — ради этого факта игра и затевается.',
      },
    },
    {
      name: 'source',
      type: 'text',
      label: 'Источник факта',
      admin: {
        description:
          'Проверяемый источник (ссылка или издание). Обязателен для образовательной игры — общий для всех языков.',
      },
    },
    {
      name: 'hint',
      type: 'text',
      label: 'Подсказка',
      localized: true,
      admin: { description: 'Необязательно — короткая подсказка по желанию.' },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Порядок',
      admin: {
        position: 'sidebar',
        description: 'Меньше — раньше. Пусто — в конце, по дате.',
      },
    },
  ],
  hooks: {
    beforeValidate: [validateQuizQuestion],
    afterChange: [revalidateQuiz],
    afterDelete: [revalidateQuizDelete],
  },
  versions: {
    drafts: true,
  },
}
