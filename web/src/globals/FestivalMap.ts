import type { GlobalConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { anyone } from '../access/anyone'
import { revalidateFestivalMap } from '../hooks/revalidateFestivalMap'

// season-MVP «Карта фестиваля». Глобал (одна карта на фестиваль): план территории
// картинкой + список объектов (еда/парковка/туалеты/сцены). Asset плана — это просто
// загрузка изображения в админке: пока картинки нет, /map показывает заглушку.
export const FestivalMap: GlobalConfig = {
  slug: 'festival-map',
  label: 'Карта фестиваля',
  access: {
    read: anyone, // публичная; план — media (public), объекты — label/type/note (не PII)
    update: adminOrEditor,
  },
  admin: {
    description: 'План территории + объекты (еда, парковка, туалеты, сцены). Объекты удобно подписать прямо на картинке плана.',
  },
  fields: [
    {
      name: 'planImage',
      type: 'upload',
      relationTo: 'media',
      label: 'План территории (картинка)',
      admin: {
        description: 'Схема территории. Подпишите объекты прямо на изображении — список ниже дублирует их для удобства.',
      },
    },
    {
      name: 'intro',
      type: 'textarea',
      label: 'Короткое описание',
    },
    {
      name: 'points',
      type: 'array',
      label: 'Объекты на территории',
      labels: { singular: 'Объект', plural: 'Объекты' },
      fields: [
        {
          name: 'label',
          type: 'text',
          label: 'Название',
          required: true,
        },
        {
          name: 'type',
          type: 'select',
          label: 'Тип',
          defaultValue: 'other',
          options: [
            { label: 'Сцена', value: 'stage' },
            { label: 'Еда', value: 'food' },
            { label: 'Вход', value: 'entrance' },
            { label: 'Парковка', value: 'parking' },
            { label: 'Туалеты', value: 'wc' },
            { label: 'Медпункт', value: 'medical' },
            { label: 'Другое', value: 'other' },
          ],
        },
        {
          name: 'note',
          type: 'text',
          label: 'Примечание',
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateFestivalMap],
  },
}
