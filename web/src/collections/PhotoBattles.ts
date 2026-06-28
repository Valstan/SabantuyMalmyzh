import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { adminOrEditorField } from '../access/adminOrEditorField'
import { anyone } from '../access/anyone'
import { rateLimitBattle } from '../hooks/rateLimitBattle'
import { stampIpHash } from '../hooks/stampIpHash'
import { recountBattleAfterChange, recountBattleAfterDelete } from '../hooks/recountBattle'

// Раунды игры «Фотобитва»: посетителю показывают два случайных фото из «Народной ленты»,
// он выбирает, какое больше нравится. Одна строка = один раунд (winner+loser). Счёт игры
// (battleWins/battleShows) живёт на самих публикациях, его пересчитывает afterChange
// COUNT'ом. Счёт ОТДЕЛЬНЫЙ от лайков ленты (likeCount) — это разные сигналы (выбор в паре
// vs. абсолютный лайк). read закрыт на персонал (#015): индивидуальные раунды содержат
// ipHash, публично не нужны. НЕ versioned → без `_v` (обход G7).
export const PhotoBattles: CollectionConfig<'photo-battles'> = {
  slug: 'photo-battles',
  labels: {
    singular: 'Раунд Фотобитвы',
    plural: 'Фотобитва (раунды)',
  },
  access: {
    create: anyone,
    read: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['winner', 'loser', 'createdAt'],
    description:
      'Раунды игры «Фотобитва». Счёт побед/показов — на самих публикациях (battleWins/battleShows), отдельно от лайков ленты.',
  },
  fields: [
    {
      name: 'winner',
      type: 'relationship',
      label: 'Победитель (публикация)',
      relationTo: 'submissions',
      required: true,
    },
    {
      name: 'winnerIndex',
      type: 'number',
      label: 'Индекс кадра-победителя',
      defaultValue: 0,
      min: 0,
      admin: { description: 'Какой кадр поста победил (0 = обложка). Мульти-файловые посты.' },
    },
    {
      name: 'loser',
      type: 'relationship',
      label: 'Проигравший (публикация)',
      relationTo: 'submissions',
      required: true,
    },
    {
      name: 'loserIndex',
      type: 'number',
      label: 'Индекс проигравшего кадра',
      defaultValue: 0,
      min: 0,
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
  ],
  hooks: {
    beforeValidate: [rateLimitBattle],
    beforeChange: [stampIpHash],
    afterChange: [recountBattleAfterChange],
    afterDelete: [recountBattleAfterDelete],
  },
  timestamps: true,
}
