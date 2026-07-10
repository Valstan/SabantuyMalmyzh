import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'
import { populatePublishedAt } from '../hooks/populatePublishedAt'
import { revalidateGallery, revalidateGalleryDelete } from '../hooks/revalidateGallery'
import { slugField } from '../fields/slug'

// Галерея — фото и видео. Фото через Media (внешнее хранилище — цель),
// видео — встраивание плеером (Rutube/VK), НЕ self-host с VPS.
export const Gallery: CollectionConfig<'gallery'> = {
  slug: 'gallery',
  labels: {
    singular: 'Галерея',
    plural: 'Галереи',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: authenticatedOrPublished,
    update: adminOrEditor,
  },
  admin: {
    defaultColumns: ['title', 'date', '_status', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Название альбома',
      required: true,
      localized: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Описание',
      localized: true,
    },
    {
      name: 'date',
      type: 'date',
      label: 'Дата съёмки',
    },
    {
      name: 'event',
      type: 'relationship',
      label: 'Связанное событие',
      relationTo: 'events',
    },
    {
      name: 'coverImage',
      type: 'upload',
      label: 'Обложка',
      relationTo: 'media',
    },
    {
      name: 'photos',
      type: 'array',
      label: 'Фотографии',
      labels: { singular: 'Фото', plural: 'Фото' },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
          label: 'Подпись',
        },
      ],
    },
    {
      name: 'videos',
      type: 'array',
      label: 'Видео (встраивание Rutube/VK)',
      labels: { singular: 'Видео', plural: 'Видео' },
      fields: [
        {
          name: 'url',
          type: 'text',
          label: 'Ссылка на видео (embed)',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          label: 'Название',
        },
      ],
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
    afterChange: [revalidateGallery],
    afterDelete: [revalidateGalleryDelete],
  },
  versions: {
    drafts: true,
  },
}
