import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'
import { populatePublishedAt } from '../hooks/populatePublishedAt'
import { notifyPushNews } from '../hooks/notifyPush'
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
    // Откуда пост пришёл (приёмник конвейера Сарафана, D-093). Заполняется только
    // приёмником; редактор видит атрибуцию и может её поправить.
    {
      name: 'source',
      type: 'group',
      label: 'Источник (ВК-конвейер)',
      admin: { position: 'sidebar' },
      fields: [
        {
          name: 'vkPostId',
          type: 'text',
          label: 'VK post ID',
          unique: true,
          index: true,
          admin: { description: 'Ключ идемпотентности приёмника — повторная доставка не создаёт дубль.' },
        },
        {
          name: 'sourceUrl',
          type: 'text',
          label: 'Ссылка на оригинал',
          validate: (
            value: string | null | undefined,
            { siblingData }: { siblingData?: { vkPostId?: string | null } },
          ) => {
            if (siblingData?.vkPostId && !value) return 'Для поста из ВК обязательна ссылка на оригинал.'
            return true
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [populatePublishedAt],
    afterChange: [revalidateNews, notifyPushNews],
    afterDelete: [revalidateNewsDelete],
  },
  versions: {
    drafts: true,
  },
}
