import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'

// Web-push подписки браузеров на уведомления о новом контенте (Новости /novosti,
// Народная лента /lenta). Записи создаются ТОЛЬКО через наши роуты
// /api/push/{subscribe,unsubscribe} (валидация + overrideAccess) — прямой REST
// закрыт целиком (#015): endpoint+ключи позволяют слать пуши этому браузеру,
// наружу их не отдаём. НЕ versioned, НЕ localized.
export const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  labels: {
    singular: 'Push-подписка',
    plural: 'Push-подписки',
  },
  access: {
    create: adminOrEditor,
    read: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['endpoint', 'topicNews', 'topicLenta', 'createdAt'],
    description: 'Браузеры, подписанные на push-уведомления (создаются с сайта).',
  },
  fields: [
    {
      name: 'endpoint',
      type: 'text',
      label: 'Endpoint (push-сервис браузера)',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'p256dh',
      type: 'text',
      label: 'Ключ p256dh',
      required: true,
    },
    {
      name: 'auth',
      type: 'text',
      label: 'Ключ auth',
      required: true,
    },
    {
      name: 'topicNews',
      type: 'checkbox',
      label: 'Новости праздника',
      defaultValue: true,
    },
    {
      name: 'topicLenta',
      type: 'checkbox',
      label: 'Народная лента',
      defaultValue: true,
    },
    {
      name: 'locale',
      type: 'text',
      label: 'Локаль подписчика',
      defaultValue: 'ru',
    },
  ],
  timestamps: true,
}
