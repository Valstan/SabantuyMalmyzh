import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { adminOrEditorField } from '../access/adminOrEditorField'
import { anyone } from '../access/anyone'
import { drawRaffleWinner } from '../hooks/drawRaffleWinner'

// Розыгрыш призов (идея I4). Сам розыгрыш заводят/ведут орги; заявки на участие —
// отдельная коллекция RaffleEntry (ПДн). Поля НЕ локализованы (день-в-день фича,
// TT для розыгрыша не нужен → проще миграция, без _locales-таблиц).
//
// Публичный read=anyone отдаёт инфо о призе и статусе (isOpen/drawnAt), НО поле
// winner закрыто field-level на персонал (#015) — личность победителя не светим в
// публичный API (152-ФЗ; объявление имени — на усмотрение оргов отдельно).
//
// Розыгрыш победителя — галка drawNow в админке: хук drawRaffleWinner выбирает
// случайную заявку, пишет winner+drawnAt, закрывает приём (isOpen=false) и сбрасывает
// drawNow. Случайность на сервере (Math.random в хуке), без custom admin-UI.
export const Raffle: CollectionConfig<'raffle'> = {
  slug: 'raffle',
  labels: {
    singular: 'Розыгрыш',
    plural: 'Розыгрыши',
  },
  access: {
    create: adminOrEditor,
    read: anyone,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['title', 'prize', 'isOpen', 'drawnAt', 'updatedAt'],
    useAsTitle: 'title',
    description: 'Розыгрыш призов. Заявки участников — в коллекции «Заявки на розыгрыш» (ПДн, доступ у персонала).',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Название розыгрыша',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Описание',
    },
    {
      name: 'prize',
      type: 'text',
      label: 'Приз',
    },
    {
      name: 'isOpen',
      type: 'checkbox',
      label: 'Приём заявок открыт',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Если включено — на сайте показывается форма участия.',
      },
    },
    {
      name: 'drawNow',
      type: 'checkbox',
      label: 'Провести розыгрыш сейчас',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Поставьте галку и сохраните — система выберет случайного победителя из заявок, закроет приём и снимет эту галку.',
      },
    },
    {
      name: 'winner',
      type: 'relationship',
      label: 'Победитель',
      relationTo: 'raffle-entries',
      // #015: личность победителя — ПДн, не отдаём в публичный read (read=anyone у
      // коллекции). Задаёт только хук розыгрыша / персонал.
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Заполняется автоматически при розыгрыше.',
      },
    },
    {
      name: 'drawnAt',
      type: 'date',
      label: 'Дата розыгрыша',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [drawRaffleWinner],
  },
  timestamps: true,
}
