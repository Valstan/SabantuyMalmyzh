import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'
import { populatePublishedAt } from '../hooks/populatePublishedAt'
import { revalidateNews, revalidateNewsDelete } from '../hooks/revalidateNews'
import { slugField } from '../fields/slug'

// Новости праздника — блог-лента: пост = заголовок + обложка + богатый текст
// (картинки внутри текста — upload-узлы media). Публикуется организаторами.
export const News: CollectionConfig<'news'> = {
  slug: 'news',
  labels: {
    singular: 'Новость',
    plural: 'Новости',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: authenticatedOrPublished,
    update: adminOrEditor,
  },
  admin: {
    defaultColumns: ['title', 'publishedAt', '_status', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Заголовок',
      required: true,
      localized: true,
    },
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Анонс (краткий текст в ленте)',
      localized: true,
    },
    {
      name: 'cover',
      type: 'upload',
      label: 'Обложка',
      relationTo: 'media',
    },
    {
      name: 'body',
      type: 'richText',
      label: 'Текст новости',
      localized: true,
    },
    {
      name: 'videos',
      type: 'array',
      label: 'Видео (по ссылке — VK / Rutube / YouTube)',
      labels: { singular: 'Видео', plural: 'Видео' },
      admin: {
        description:
          'Видео не заливается на сайт — вставьте ссылку на ролик (VK, Rutube, YouTube), на странице появится плеер.',
      },
      fields: [
        {
          name: 'url',
          type: 'text',
          label: 'Ссылка на видео',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          label: 'Название (необязательно)',
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Дата публикации',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    slugField(),
  ],
  hooks: {
    beforeChange: [populatePublishedAt],
    afterChange: [revalidateNews],
    afterDelete: [revalidateNewsDelete],
  },
  versions: {
    drafts: true,
  },
}
