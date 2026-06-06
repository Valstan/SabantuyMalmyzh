import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { adminOrEditorField } from '../access/adminOrEditorField'
import { anyone } from '../access/anyone'
import { confirmSubscription } from '../hooks/confirmSubscription'
import { rateLimitSubscribe } from '../hooks/rateLimitSubscribe'

// Подписка на анонс праздника (идея I6): «напомнить о Сабантуе» — письмо до начала.
// Эта коллекция ХРАНИТ подписчиков; саму рассылку-напоминание орги шлют позже.
//
// ⚠️ pool #015 (server write-authz vs UI edit-gate) — как у Registrations:
//   create = публичный (посетитель подписывается с сайта)
//   read/update/delete = ТОЛЬКО персонал (admin || editor). НЕ «любой authenticated».
//
// ⚠️ 152-ФЗ (перс. данные): email — ПДн → обязательная галка consent (валидируется
//   в true) + ссылка на политику. read закрыт на персонал → в публичный API не утекает.
//   Дедуп — `unique` на email (Payload отклонит повтор валидацией + БД-индексом).
export const Subscribers: CollectionConfig<'subscribers'> = {
  slug: 'subscribers',
  labels: {
    singular: 'Подписчик',
    plural: 'Подписчики (анонс)',
  },
  access: {
    create: anyone,
    read: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['email', 'name', 'source', 'createdAt'],
    useAsTitle: 'email',
    description:
      'Подписчики на анонс праздника. Содержат email (152-ФЗ) — доступ только у персонала. Рассылку-напоминание орги делают вручную ближе к дате.',
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'text',
      label: 'Имя',
      maxLength: 200,
    },
    {
      name: 'consent',
      type: 'checkbox',
      label: 'Согласие на обработку персональных данных (152-ФЗ)',
      required: true,
      validate: (value: unknown) =>
        value === true || 'Без согласия на обработку персональных данных подписаться нельзя.',
      admin: {
        description: 'Обязательно. Посетитель подтверждает согласие при подписке.',
      },
    },
    {
      name: 'source',
      type: 'select',
      label: 'Источник',
      defaultValue: 'website',
      // pool #015: служебное поле — аноним при публичном create его не задаёт
      // (значение отбрасывается, применяется defaultValue 'website').
      access: {
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      options: [
        { label: 'Сайт', value: 'website' },
        { label: 'Другое', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    // rateLimit первым — отсекает спам до обращения к БД.
    beforeValidate: [rateLimitSubscribe],
    afterChange: [confirmSubscription],
  },
  timestamps: true,
}
