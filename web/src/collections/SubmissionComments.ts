import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { adminOrEditorField } from '../access/adminOrEditorField'
import { anyone } from '../access/anyone'
import { publicVisibleOrStaff } from '../access/publicVisibleOrStaff'
import { rateLimitComment } from '../hooks/rateLimitComment'
import { stampSubmissionMeta } from '../hooks/stampSubmissionMeta'
import {
  recountCommentsAfterChange,
  recountCommentsAfterDelete,
} from '../hooks/recountComments'

// Комментарии к публикациям ленты. Постмодерация (как submissions): виден сразу,
// персонал скрывает/удаляет в /admin, жалобы → авто-скрытие на пороге.
//
// ⚠️ #015: create=anyone, read=publicVisibleOrStaff (аноним только status=visible),
//   update/delete=adminOrEditor. Служебные поля закрыты field-access на запись
//   анонимом; ipHash/userAgent/reportCount/hiddenReason — и на публичное чтение.
export const SubmissionComments: CollectionConfig<'submission-comments'> = {
  slug: 'submission-comments',
  labels: {
    singular: 'Комментарий',
    plural: 'Комментарии ленты',
  },
  access: {
    create: anyone,
    read: publicVisibleOrStaff,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['authorName', 'body', 'submission', 'status', 'reportCount', 'createdAt'],
    useAsTitle: 'authorName',
    description: 'Комментарии к публикациям ленты. Постмодерация: видно сразу, скрывайте при жалобах.',
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
      name: 'authorName',
      type: 'text',
      label: 'Имя автора',
      maxLength: 64,
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Текст',
      required: true,
      maxLength: 1000,
    },

    // --- служебные поля: пишет сервер/хуки/персонал (#015) ---
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      defaultValue: 'visible',
      access: {
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      options: [
        { label: 'Видно', value: 'visible' },
        { label: 'Скрыто', value: 'hidden' },
        { label: 'Удалено', value: 'removed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'hiddenReason',
      type: 'text',
      label: 'Причина скрытия',
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'reportCount',
      type: 'number',
      label: 'Жалоб',
      defaultValue: 0,
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { position: 'sidebar', readOnly: true },
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
      label: 'Владелец (хеш токена браузера)',
      // Автор правит/удаляет «свой» коммент по совпадению хеша токена (PR3 /api/ugc/*).
      index: true,
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { hidden: true },
    },
    {
      name: 'ownerVisitor',
      type: 'number',
      label: 'Владелец (VK-аккаунт)',
      // PK строки visitors — управление «своим» коммом с любого устройства (VK-вход, PR5B).
      index: true,
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { hidden: true },
    },
    {
      name: 'userAgent',
      type: 'text',
      label: 'User-Agent',
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { hidden: true },
    },
  ],
  hooks: {
    beforeValidate: [rateLimitComment],
    beforeChange: [stampSubmissionMeta],
    afterChange: [recountCommentsAfterChange],
    afterDelete: [recountCommentsAfterDelete],
  },
  timestamps: true,
}
