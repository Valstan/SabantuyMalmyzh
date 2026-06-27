import type { GlobalConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { anyone } from '../access/anyone'
import { revalidateLiveStream } from '../hooks/revalidateLiveStream'

// Прямой эфир (live broadcast) праздника. Object Storage эфир не вещает — встраиваем
// внешний плеер VK Live: организатор включает трансляцию в приложении ВКонтакте,
// вставляет сюда ссылку и ставит «Эфир идёт». Страница /efir показывает плеер; пока
// выключено — заглушку. Наш бокс не нагружается (видео раздаёт VK).
//
// Поля не-localized (одна трансляция на всех); статичные подписи страницы — в i18n.
export const LiveStream: GlobalConfig = {
  slug: 'live-stream',
  label: 'Прямой эфир',
  access: {
    read: anyone, // публичная: страница /efir рендерит плеер; секретов нет
    update: adminOrEditor,
  },
  admin: {
    description:
      'Прямой эфир через VK. Включите трансляцию в приложении ВКонтакте, вставьте ссылку на видео/эфир и поставьте «Эфир идёт». На /efir появится плеер.',
  },
  fields: [
    {
      name: 'isLive',
      type: 'checkbox',
      label: 'Эфир идёт (показать плеер)',
      defaultValue: false,
    },
    {
      name: 'vkUrl',
      type: 'text',
      label: 'Ссылка на трансляцию VK',
      admin: {
        description:
          'Ссылка вида https://vk.com/video-123456_789012 (или код «video_ext»). Поддерживается только VK.',
      },
    },
    {
      name: 'note',
      type: 'text',
      label: 'Подпись (необязательно)',
      admin: { description: 'Напр.: «Прямой эфир открытия с майдана».' },
    },
  ],
  hooks: {
    afterChange: [revalidateLiveStream],
  },
}
