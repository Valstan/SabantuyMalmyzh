import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'
import { populatePublishedAt } from '../hooks/populatePublishedAt'
import { revalidateEvent, revalidateEventDelete } from '../hooks/revalidateEvent'
import { slugField } from '../fields/slug'

// Расписание — главная фича сезона: время, место, описание, категория.
export const Events: CollectionConfig<'events'> = {
  slug: 'events',
  labels: {
    singular: 'Событие',
    plural: 'Расписание',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: authenticatedOrPublished,
    update: adminOrEditor,
  },
  admin: {
    defaultColumns: ['title', 'startDate', 'category', '_status', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Название',
      required: true,
      localized: true,
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Краткое описание',
      localized: true,
    },
    {
      name: 'startDate',
      type: 'date',
      label: 'Начало',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'endDate',
      type: 'date',
      label: 'Окончание',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'location',
      type: 'text',
      label: 'Место проведения',
      localized: true,
    },
    {
      name: 'venue',
      type: 'text',
      label: 'Площадка / сцена',
      localized: true,
      admin: {
        description: 'Например: Главная сцена, Спортивная площадка, Детская поляна. Группирует программу по площадкам.',
      },
    },
    {
      name: 'category',
      type: 'select',
      label: 'Категория',
      options: [
        { label: 'Концерт', value: 'concert' },
        { label: 'Спорт', value: 'sport' },
        { label: 'Национальная кухня', value: 'food' },
        { label: 'Детям', value: 'kids' },
        { label: 'Ремёсла', value: 'crafts' },
        { label: 'Церемония', value: 'ceremony' },
        { label: 'Другое', value: 'other' },
      ],
    },
    {
      name: 'heroImage',
      type: 'upload',
      label: 'Главное изображение',
      relationTo: 'media',
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Подробное описание',
      localized: true,
    },
    {
      name: 'capacity',
      type: 'number',
      label: 'Вместимость (мест)',
      min: 0,
    },
    {
      name: 'registrationEnabled',
      type: 'checkbox',
      label: 'Открыта регистрация',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Если включено — на сайте показывается форма заявки (этап M2).',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Дата публикации',
      admin: {
        position: 'sidebar',
      },
    },
    slugField(),
  ],
  hooks: {
    beforeChange: [populatePublishedAt],
    afterChange: [revalidateEvent],
    afterDelete: [revalidateEventDelete],
  },
  versions: {
    drafts: true,
  },
}
