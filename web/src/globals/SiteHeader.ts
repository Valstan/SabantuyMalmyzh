import type { GlobalConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { anyone } from '../access/anyone'
import { revalidateChrome } from '../hooks/revalidateSiteContent'

// Редактируемые тексты шапки (бренд + подписи пунктов меню). Порядок и href ссылок —
// в коде (SiteChrome); глобал перекрывает подписи по `key`. Без drafts.
export const SiteHeader: GlobalConfig = {
  slug: 'header',
  label: 'Шапка сайта',
  access: { read: anyone, update: adminOrEditor },
  admin: { description: 'Название сайта и подписи пунктов меню. Порядок и адреса ссылок — в коде.' },
  fields: [
    { name: 'brand', type: 'text', label: 'Название сайта', localized: true },
    {
      name: 'nav',
      type: 'array',
      label: 'Пункты меню',
      labels: { singular: 'Пункт', plural: 'Пункты' },
      admin: { description: 'Подписи пунктов меню. Адрес — в коде; строки по «Ключу».' },
      fields: [
        { name: 'key', type: 'text', label: 'Ключ (не менять)', required: true, admin: { readOnly: true } },
        { name: 'label', type: 'text', label: 'Подпись', localized: true },
      ],
    },
  ],
  hooks: { afterChange: [revalidateChrome] },
}
