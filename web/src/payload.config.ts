import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Pages } from './collections/Pages'
import { Events } from './collections/Events'
import { Gallery } from './collections/Gallery'
import { Media } from './collections/Media'
import { PollVotes } from './collections/PollVotes'
import { QuizQuestions } from './collections/QuizQuestions'
import { QuizResults } from './collections/QuizResults'
import { Raffle } from './collections/Raffle'
import { RaffleEntry } from './collections/RaffleEntry'
import { Registrations } from './collections/Registrations'
import { Subscribers } from './collections/Subscribers'
import { Users } from './collections/Users'
import { FestivalMap } from './globals/FestivalMap'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Сабантуй Малмыж',
    },
  },
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // MVP/greenfield: push автосинхронизирует схему в dev. Прод-миграции —
    // на этапе деплоя (web/src/migrations/), как у GONBA.
    push: true,
  }),
  collections: [Pages, Events, Gallery, Media, Registrations, PollVotes, QuizQuestions, QuizResults, Subscribers, Raffle, RaffleEntry, Users],
  globals: [FestivalMap],
  // Email-уведомления о новых заявках (хук notifyOrganizer → payload.sendEmail).
  // Провайдеро-независимо: любой внешний SMTP-relay (Resend / Brevo / SendGrid / …)
  // задаётся через env. Пока SMTP_HOST не задан, адаптер не подключаем → Payload
  // пишет письма в консоль (dev/CI: тот самый WARN «No email adapter») — сборка и
  // типы остаются зелёными без секретов. Реальные SMTP-доступы живут ТОЛЬКО в
  // /etc/sabantuy/sabantuy.env на проде (#008), в репозиторий не попадают.
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: process.env.SMTP_FROM_ADDRESS || 'no-reply@sabantuy-malmyzh.ru',
        defaultFromName: process.env.SMTP_FROM_NAME || 'Сабантуй Малмыж',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          // 465 = implicit TLS (secure); 587/2525 = STARTTLS (secure:false).
          // Переопределяется явным SMTP_SECURE=true|false при нестандартном relay.
          secure: process.env.SMTP_SECURE
            ? process.env.SMTP_SECURE === 'true'
            : Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        },
      })
    : undefined,
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || ''].filter(Boolean),
  secret: process.env.PAYLOAD_SECRET || '',
  sharp,
  // Двуязычие: Сабантуй — татарский праздник, ru/tt культурно уместно.
  // Включаем на greenfield (дёшево), пока БД пустая — ретрофит на наполненную
  // БД болезнен (миграция всех localized-полей). См. письмо brain 2026-06-04.
  // default+fallback = ru: пока tt-переводов нет, публичный фронт показывает ru.
  localization: {
    locales: [
      { label: 'Русский', code: 'ru' },
      { label: 'Татарча', code: 'tt' },
    ],
    defaultLocale: 'ru',
    fallback: true,
  },
  i18n: {
    fallbackLanguage: 'ru',
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
