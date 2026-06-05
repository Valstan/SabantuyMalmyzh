import type { CollectionConfig } from 'payload'

import path from 'path'
import { fileURLToPath } from 'url'

import { adminOrEditor } from '../access/adminOrEditor'
import { anyone } from '../access/anyone'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Медиафайл',
    plural: 'Медиа',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: anyone,
    update: adminOrEditor,
  },
  admin: {
    defaultColumns: ['filename', 'alt', 'updatedAt'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Описание (alt)',
      localized: true,
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Подпись',
      localized: true,
    },
  ],
  upload: {
    // MVP: временное локальное хранилище. Цель — внешнее хранилище (Я.Диск /
    // встраивание плеером для видео), чтобы не отдавать тяжёлое с маленького VPS.
    // См. docs/adr/0001-media-storage.md.
    //
    // ⚠️ В standalone-сборке Next относительный staticDir (через import.meta.url)
    // «запекается» в АБСОЛЮТНЫЙ путь СБОРОЧНОЙ машины (/home/runner/.../public/media)
    // и на проде файлы не находятся (ERROR «missing on the disk»). Поэтому на проде
    // задаём MEDIA_DIR (персистентный каталог вне релиз-директории, переживающий
    // деплои) в /etc/sabantuy/sabantuy.env — читается в рантайме. Локально env нет →
    // относительный путь как прежде.
    staticDir: process.env.MEDIA_DIR || path.resolve(dirname, '../../public/media'),
    focalPoint: true,
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumbnail', width: 400 },
      { name: 'card', width: 768 },
      { name: 'wide', width: 1920 },
    ],
  },
}
