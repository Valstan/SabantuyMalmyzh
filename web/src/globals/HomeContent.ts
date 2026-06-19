import type { GlobalConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { anyone } from '../access/anyone'
import { revalidateHome } from '../hooks/revalidateSiteContent'

// Редактируемый текст главной (on-site). Структура (иконки/обложки/href/порядок
// секций) остаётся в коде (lib/sabantuyFeatures, lib/cultureSections, HomeView);
// в БД едет только видимый локализованный ТЕКСТ. HomeView читает глобал с фолбэком
// на код/i18n (пусто/сбой → текущее поведение). Без drafts: PATCH сразу публичен.
//
// Массивы features/cultureCards — overlay по `key`: код задаёт, какие карточки есть
// (и их иконки/href), глобал перекрывает их title/text. Ключи сидятся (seedSiteContent).
export const HomeContent: GlobalConfig = {
  slug: 'home',
  label: 'Главная — тексты',
  access: { read: anyone, update: adminOrEditor },
  admin: { description: 'Тексты главной страницы: герой, заголовки секций, карточки. Картинки/иконки — в коде.' },
  fields: [
    { name: 'heroEyebrow', type: 'text', label: 'Герой: надзаголовок', localized: true },
    { name: 'heroTitleAccent', type: 'text', label: 'Герой: акцент в заголовке (напр. «Малмыж»)', localized: true },
    { name: 'heroTagline', type: 'textarea', label: 'Герой: подзаголовок', localized: true },

    { name: 'featuresEyebrow', type: 'text', label: '«Что вас ждёт»: надзаголовок', localized: true },
    { name: 'featuresTitle', type: 'text', label: '«Что вас ждёт»: заголовок', localized: true },
    {
      name: 'features',
      type: 'array',
      label: 'Карточки «Что вас ждёт»',
      labels: { singular: 'Карточка', plural: 'Карточки' },
      admin: { description: 'Текст карточек. Иконка/обложка — в коде; строки сопоставляются по «Ключу».' },
      fields: [
        { name: 'key', type: 'text', label: 'Ключ (не менять)', required: true, admin: { readOnly: true } },
        { name: 'title', type: 'text', label: 'Заголовок', localized: true },
        { name: 'text', type: 'text', label: 'Описание', localized: true },
      ],
    },

    { name: 'cultureEyebrow', type: 'text', label: '«Традиции и культура»: надзаголовок', localized: true },
    { name: 'cultureTitle', type: 'text', label: '«Традиции и культура»: заголовок', localized: true },
    { name: 'cultureLead', type: 'textarea', label: '«Традиции и культура»: лид', localized: true },
    {
      name: 'cultureCards',
      type: 'array',
      label: 'Карточки разделов культуры',
      labels: { singular: 'Карточка', plural: 'Карточки' },
      admin: { description: 'Текст карточек-разделов. Иконка/ссылка — в коде; строки по «Ключу».' },
      fields: [
        { name: 'key', type: 'text', label: 'Ключ (не менять)', required: true, admin: { readOnly: true } },
        { name: 'title', type: 'text', label: 'Заголовок', localized: true },
        { name: 'text', type: 'textarea', label: 'Описание', localized: true },
      ],
    },
  ],
  hooks: { afterChange: [revalidateHome] },
}
