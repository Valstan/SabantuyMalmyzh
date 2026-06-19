import type { GlobalConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { anyone } from '../access/anyone'
import { revalidateChrome } from '../hooks/revalidateSiteContent'

// Редактируемый текст подвала (строка копирайта). Ссылки/навигация подвала — в коде
// (SiteChrome переиспользует подписи меню из header + разделы культуры). Без drafts.
export const SiteFooter: GlobalConfig = {
  slug: 'footer',
  label: 'Подвал сайта',
  access: { read: anyone, update: adminOrEditor },
  admin: { description: 'Строка копирайта в подвале.' },
  fields: [{ name: 'copyright', type: 'text', label: 'Копирайт', localized: true }],
  hooks: { afterChange: [revalidateChrome] },
}
