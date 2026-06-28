import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'

// Посетители, вошедшие через VK ID (НЕ персонал — у них нет пароля/доступа в /admin).
// Хранят минимум для подписи публикаций и привязки «своего» контента: vkId + имя +
// аватар. Сессия посетителя — отдельная подписанная cookie (lib/visitorSession), не
// payload-token. Логин/upsert делает роут /api/auth/vk/callback (overrideAccess).
//
// ⚠️ pool #015 + 152-ФЗ: vkId/имя/аватар — перс. данные → коллекция закрыта на персонал
//   (read/create/update/delete = adminOrEditor). В публичный API список посетителей не
//   утекает; своё имя/аватар посетитель видит через /api/auth/vk/me (из своей cookie).
export const Visitors: CollectionConfig<'visitors'> = {
  slug: 'visitors',
  labels: {
    singular: 'Посетитель (VK)',
    plural: 'Посетители (VK)',
  },
  access: {
    create: adminOrEditor,
    read: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['name', 'vkId', 'lastLoginAt', 'createdAt'],
    useAsTitle: 'name',
    description:
      'Посетители, вошедшие через ВКонтакте. Содержат vkId/имя/аватар (152-ФЗ) — доступ только у персонала. Закрепляют «своё» в «Народной ленте».',
  },
  fields: [
    {
      name: 'vkId',
      type: 'text',
      label: 'VK ID',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Идентификатор пользователя ВКонтакте (стабильный ключ аккаунта).' },
    },
    {
      name: 'name',
      type: 'text',
      label: 'Имя',
      maxLength: 200,
    },
    {
      name: 'avatarUrl',
      type: 'text',
      label: 'Аватар (URL)',
      maxLength: 500,
    },
    {
      name: 'lastLoginAt',
      type: 'date',
      label: 'Последний вход',
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
