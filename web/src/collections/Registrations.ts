import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { adminOrEditorField } from '../access/adminOrEditorField'
import { anyone } from '../access/anyone'
import { enforceRegistrationOpen } from '../hooks/enforceRegistrationOpen'
import { notifyOrganizer } from '../hooks/notifyOrganizer'

// Заявки на участие в мероприятиях.
//
// ⚠️ pool #015 (server write-authz vs UI edit-gate) — С ПЕРВОГО ДНЯ:
//   create  = публичный (посетитель отправляет заявку с сайта)
//   read/update/delete = ТОЛЬКО персонал (admin || editor)
// НЕ «любой authenticated». Это ровно та дыра, которую GONBA закрыла 2026-06-02:
// если read был бы `authenticated`, то будущие end-user аккаунты читали бы чужие
// перс. данные в обход UI. Здесь read закрыт на персонал → утечки нет.
//
// ⚠️ 152-ФЗ (перс. данные): обязательная галка согласия (consent) + ссылка на
//   политику обработки ПДн (страница в Pages). Хранение в РФ (jino = РФ). Заявки
//   содержат ФИО/контакты — поэтому read закрыт, и в публичный API они не утекают.
export const Registrations: CollectionConfig<'registrations'> = {
  slug: 'registrations',
  labels: {
    singular: 'Заявка',
    plural: 'Заявки',
  },
  access: {
    create: anyone,
    read: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['fullName', 'event', 'participants', 'status', 'createdAt'],
    useAsTitle: 'fullName',
    description: 'Заявки посетителей. Содержат персональные данные (152-ФЗ) — доступ только у персонала.',
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      label: 'ФИО',
      required: true,
      maxLength: 200,
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Телефон',
      required: true,
      maxLength: 32,
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email',
    },
    {
      name: 'event',
      type: 'relationship',
      label: 'Мероприятие',
      relationTo: 'events',
      required: true,
    },
    {
      name: 'participants',
      type: 'number',
      label: 'Количество участников',
      required: true,
      defaultValue: 1,
      min: 1,
    },
    {
      name: 'comment',
      type: 'textarea',
      label: 'Комментарий',
      maxLength: 1000,
    },
    {
      name: 'consent',
      type: 'checkbox',
      label: 'Согласие на обработку персональных данных (152-ФЗ)',
      required: true,
      validate: (value: unknown) =>
        value === true || 'Без согласия на обработку персональных данных заявку отправить нельзя.',
      admin: {
        description: 'Обязательно. Посетитель должен подтвердить согласие при отправке заявки.',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      defaultValue: 'new',
      // pool #015: служебное поле — аноним при публичном create его не задаёт
      // (значение отбрасывается, применяется defaultValue 'new'). Менять — только персонал.
      access: {
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      options: [
        { label: 'Новая', value: 'new' },
        { label: 'Подтверждена', value: 'confirmed' },
        { label: 'Отменена', value: 'cancelled' },
      ],
      admin: {
        position: 'sidebar',
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
        { label: 'Телефон', value: 'phone' },
        { label: 'Другое', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeValidate: [enforceRegistrationOpen],
    afterChange: [notifyOrganizer],
  },
  timestamps: true,
}
