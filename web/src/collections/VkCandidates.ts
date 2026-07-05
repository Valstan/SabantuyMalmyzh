import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { approveVkCandidate } from '../hooks/approveVkCandidate'
import { revalidateFotostena, revalidateFotostenaDelete } from '../hooks/revalidateFotostena'

// Кандидаты «Фотостены» (I8): фото из открытых VK-постов о Сабантуе, собранные
// коллектором collectVkCandidates (workflow collect-vk.yml, свой сервис-токен VK).
// Полуавтомат с модерацией: коллектор пишет status=new, персонал в /admin ставит
// approved → хук approveVkCandidate скачивает кадр в Media и фото попадает на
// /fotostena с атрибуцией автору и ссылкой на исходный пост.
//
// ⚠️ #015: весь доступ = adminOrEditor (включая create — пишет только коллектор
//   через Local API с overrideAccess). Публичная страница читает сервером.
export const VkCandidates: CollectionConfig<'vk-candidates'> = {
  slug: 'vk-candidates',
  labels: {
    singular: 'Кандидат фотостены (VK)',
    plural: 'Фотостена — кандидаты из VK',
  },
  access: {
    create: adminOrEditor,
    read: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['authorName', 'status', 'vkPublishedAt', 'foundQuery', 'updatedAt'],
    useAsTitle: 'authorName',
    description:
      'Фото из открытых VK-постов о празднике. Поставьте статус «Одобрено» — кадр скачается в Media и появится на странице «Фотостена» со ссылкой на автора. Отклонённые никуда не попадают.',
  },
  fields: [
    {
      // Дедуп-ключ кандидата: owner_id VK-поста + id поста + индекс фото в нём.
      name: 'vkKey',
      type: 'text',
      label: 'VK-ключ (owner_post_index)',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      required: true,
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'Новый', value: 'new' },
        { label: 'Одобрено', value: 'approved' },
        { label: 'Отклонено', value: 'rejected' },
      ],
    },
    {
      name: 'photoUrl',
      type: 'text',
      label: 'URL фото (VK CDN, максимальный размер)',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'postUrl',
      type: 'text',
      label: 'Ссылка на исходный VK-пост',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'authorName',
      type: 'text',
      label: 'Автор (имя/сообщество в VK)',
      admin: { readOnly: true },
    },
    {
      name: 'authorUrl',
      type: 'text',
      label: 'Ссылка на автора',
      admin: { readOnly: true },
    },
    {
      name: 'text',
      type: 'textarea',
      label: 'Текст поста (фрагмент)',
      maxLength: 1000,
      admin: { readOnly: true },
    },
    {
      name: 'foundQuery',
      type: 'text',
      label: 'Найдено по запросу',
      admin: { readOnly: true },
    },
    {
      name: 'vkPublishedAt',
      type: 'date',
      label: 'Дата VK-поста',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      // Заполняется approve-хуком: скачанный кадр в Media. Если пусто у
      // approved-кандидата — скачивание не удалось (см. downloadError),
      // страница такой пропускает.
      name: 'media',
      type: 'upload',
      label: 'Кадр в Media (после одобрения)',
      relationTo: 'media',
    },
    {
      name: 'downloadError',
      type: 'text',
      label: 'Ошибка скачивания (если была)',
      admin: { readOnly: true },
    },
  ],
  hooks: {
    afterChange: [approveVkCandidate, revalidateFotostena],
    afterDelete: [revalidateFotostenaDelete],
  },
  timestamps: true,
}
