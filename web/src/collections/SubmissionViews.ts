import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { adminOrEditorField } from '../access/adminOrEditorField'
import { anyone } from '../access/anyone'
import { rateLimitView } from '../hooks/rateLimitView'
import { stampIpHash } from '../hooks/stampIpHash'
import { recountViewsAfterChange, recountViewsAfterDelete } from '../hooks/recountViews'

// Просмотры публикаций «Народной ленты». Одна строка = один уникальный зритель (дедуп
// по браузерному токену ownerHash, иначе по хешу IP). Агрегат (viewCount) живёт на самой
// публикации, его пересчитывает afterChange/afterDelete COUNT'ом. Засчитывается при
// ОТКРЫТИИ медиа (лайтбокс/видео), не при прокрутке — осмысленное вовлечение. read закрыт
// на персонал (#015): индивидуальные просмотры содержат ipHash, публично не нужны.
export const SubmissionViews: CollectionConfig<'submission-views'> = {
  slug: 'submission-views',
  labels: {
    singular: 'Просмотр',
    plural: 'Просмотры ленты',
  },
  access: {
    create: anyone,
    read: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['submission', 'createdAt'],
    description: 'Просмотры публикаций ленты. Агрегат viewCount — на самой публикации.',
  },
  fields: [
    {
      name: 'submission',
      type: 'relationship',
      label: 'Публикация',
      relationTo: 'submissions',
      required: true,
    },
    {
      name: 'ipHash',
      type: 'text',
      label: 'IP-хеш',
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { hidden: true },
    },
    {
      name: 'ownerHash',
      type: 'text',
      label: 'Зритель (хеш токена браузера)',
      // Дедуп «один просмотр на браузер» (точнее, чем по IP при общем NAT праздника).
      index: true,
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { hidden: true },
    },
  ],
  hooks: {
    beforeValidate: [rateLimitView],
    beforeChange: [stampIpHash],
    afterChange: [recountViewsAfterChange],
    afterDelete: [recountViewsAfterDelete],
  },
  timestamps: true,
}
