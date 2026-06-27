import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { adminOrEditorField } from '../access/adminOrEditorField'
import { anyone } from '../access/anyone'
import { rateLimitReaction } from '../hooks/rateLimitReaction'
import { stampIpHash } from '../hooks/stampIpHash'
import {
  recountReactionLikesAfterChange,
  recountReactionLikesAfterDelete,
} from '../hooks/recountReactionLikes'

// Лайки публикаций «Народной ленты». Одна строка = один лайк (дедуп «один на IP» —
// хук по хешу IP). Агрегат (likeCount) живёт на самой публикации, его пересчитывает
// afterChange/afterDelete. Индивидуальные реакции содержат ipHash → read закрыт на
// персонал (#015): публично они не нужны (лайкнул ли я — клиент знает по localStorage
// + повторный POST даёт 409).
export const SubmissionReactions: CollectionConfig<'submission-reactions'> = {
  slug: 'submission-reactions',
  labels: {
    singular: 'Лайк',
    plural: 'Лайки ленты',
  },
  access: {
    create: anyone,
    read: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['submission', 'createdAt'],
    description: 'Лайки публикаций ленты. Агрегат likeCount — на самой публикации.',
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
      label: 'Владелец (хеш токена браузера)',
      // По нему автор отменяет «свой» лайк (PR3 /api/ugc/unlike): ищем реакцию по
      // (submission, ownerHash) и удаляем → recount likeCount.
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
    beforeValidate: [rateLimitReaction],
    beforeChange: [stampIpHash],
    afterChange: [recountReactionLikesAfterChange],
    afterDelete: [recountReactionLikesAfterDelete],
  },
  timestamps: true,
}
