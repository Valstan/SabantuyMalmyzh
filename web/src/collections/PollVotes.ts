import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { anyone } from '../access/anyone'
import { rateLimitPoll } from '../hooks/rateLimitPoll'
import { POLL_OPTIONS } from '../lib/pollOptions'

// Голоса анонимного опроса «Любимое состязание». Одна строка = один голос;
// итоги считаются агрегатом (count по option) на сервере.
//
// ⚠️ pool #015: create — публичный (посетитель голосует), read/update/delete —
// только персонал. Голоса не PII, но read закрыт, чтобы их нельзя было
// перечислять/скрейпить через публичный API; итоги отдаёт сервер (overrideAccess)
// агрегатом, без отдельных строк.
export const PollVotes: CollectionConfig<'poll-votes'> = {
  slug: 'poll-votes',
  labels: {
    singular: 'Голос опроса',
    plural: 'Голоса опроса',
  },
  access: {
    create: anyone,
    read: adminOrEditor,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['option', 'createdAt'],
    useAsTitle: 'option',
    description: 'Голоса анонимного опроса «Любимое состязание». Итоги — на сайте (агрегат).',
  },
  fields: [
    {
      name: 'option',
      type: 'select',
      label: 'Вариант',
      required: true,
      // Payload валидирует select по списку значений → невалидный option отклоняется.
      options: POLL_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
    },
  ],
  hooks: {
    beforeValidate: [rateLimitPoll],
  },
  timestamps: true,
}
