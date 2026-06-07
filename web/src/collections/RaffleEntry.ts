import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { adminOrEditorField } from '../access/adminOrEditorField'
import { anyone } from '../access/anyone'
import { enforceRaffleOpen } from '../hooks/enforceRaffleOpen'
import { rateLimitRaffleEntry } from '../hooks/rateLimitRaffleEntry'

// Заявки на участие в розыгрыше (идея I4) — содержат ПДн (ФИО/телефон).
//
// ⚠️ pool #015 / 152-ФЗ — как у Registrations:
//   create = публичный (участник подаёт заявку, пока розыгрыш isOpen)
//   read/update/delete = ТОЛЬКО персонал (admin || editor). Личные данные не
//   утекают в публичный API. Обязательная галка consent + ссылка на политику.
export const RaffleEntry: CollectionConfig<'raffle-entries'> = {
  slug: 'raffle-entries',
  labels: {
    singular: 'Заявка на розыгрыш',
    plural: 'Заявки на розыгрыш',
  },
  access: {
    create: anyone,
    read: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['fullName', 'phone', 'raffle', 'createdAt'],
    useAsTitle: 'fullName',
    description: 'Заявки на участие в розыгрыше. Содержат персональные данные (152-ФЗ) — доступ только у персонала.',
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
      name: 'raffle',
      type: 'relationship',
      label: 'Розыгрыш',
      relationTo: 'raffle',
      required: true,
    },
    {
      name: 'consent',
      type: 'checkbox',
      label: 'Согласие на обработку персональных данных (152-ФЗ)',
      required: true,
      validate: (value: unknown) =>
        value === true || 'Без согласия на обработку персональных данных участвовать нельзя.',
      admin: {
        description: 'Обязательно. Участник подтверждает согласие при подаче заявки.',
      },
    },
    {
      name: 'source',
      type: 'select',
      label: 'Источник',
      defaultValue: 'website',
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
    // rateLimit первым — отсекает спам до обращения к БД в enforceRaffleOpen.
    beforeValidate: [rateLimitRaffleEntry, enforceRaffleOpen],
  },
  timestamps: true,
}
