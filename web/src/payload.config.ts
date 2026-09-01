import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import path from 'path'
import { buildConfig } from 'payload'
import { s3Storage } from '@payloadcms/storage-s3'
import { fileURLToPath } from 'url'

import { Pages } from './collections/Pages'
import { Events } from './collections/Events'
import { Gallery } from './collections/Gallery'
import { News } from './collections/News'
import { Media } from './collections/Media'
import { PollVotes } from './collections/PollVotes'
import { QuizQuestions } from './collections/QuizQuestions'
import { QuizResults } from './collections/QuizResults'
import { Raffle } from './collections/Raffle'
import { RaffleEntry } from './collections/RaffleEntry'
import { Registrations } from './collections/Registrations'
import { Submissions } from './collections/Submissions'
import { SubmissionReactions } from './collections/SubmissionReactions'
import { SubmissionViews } from './collections/SubmissionViews'
import { SubmissionComments } from './collections/SubmissionComments'
import { ContentReports } from './collections/ContentReports'
import { PhotoBattles } from './collections/PhotoBattles'
import { PushSubscriptions } from './collections/PushSubscriptions'
import { Subscribers } from './collections/Subscribers'
import { Users } from './collections/Users'
import { Visitors } from './collections/Visitors'
import { VkCandidates } from './collections/VkCandidates'
import { startPushTicker } from './lib/pushTick'
import { FestivalMap } from './globals/FestivalMap'
import { HomeContent } from './globals/HomeContent'
import { LiveStream } from './globals/LiveStream'
import { SiteHeader } from './globals/SiteHeader'
import { SiteFooter } from './globals/SiteFooter'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Сабантуй в Малмыже',
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
  collections: [Pages, Events, Gallery, News, Media, Registrations, PollVotes, QuizQuestions, QuizResults, Subscribers, Raffle, RaffleEntry, Submissions, SubmissionReactions, SubmissionViews, SubmissionComments, ContentReports, PhotoBattles, PushSubscriptions, Visitors, VkCandidates, Users],
  globals: [FestivalMap, HomeContent, LiveStream, SiteHeader, SiteFooter],
  // Email-уведомления о новых заявках (хук notifyOrganizer → payload.sendEmail).
  // Провайдеро-независимо: любой внешний SMTP-relay (Resend / Brevo / SendGrid / …)
  // задаётся через env. Пока SMTP_HOST не задан, адаптер не подключаем → Payload
  // пишет письма в консоль (dev/CI: тот самый WARN «No email adapter») — сборка и
  // типы остаются зелёными без секретов. Реальные SMTP-доступы живут ТОЛЬКО в
  // /etc/sabantuy/sabantuy.env на проде (#008), в репозиторий не попадают.
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: process.env.SMTP_FROM_ADDRESS || 'no-reply@sabantuy-malmyzh.ru',
        defaultFromName: process.env.SMTP_FROM_NAME || 'Сабантуй в Малмыже',
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
  // Тикер push-уведомлений программы («скоро начнётся событие», lib/pushTick):
  // один setInterval на процесс, no-op без VAPID-ключей (dev/CI). Payload
  // инициализируется первым запросом после старта — деплой-смоук бьёт «/».
  onInit: (payload) => {
    startPushTicker(payload)
  },
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || ''].filter(Boolean),
  secret: process.env.PAYLOAD_SECRET || '',
  sharp,
  plugins: [
    // ADR-0001 (решение 2026-09-01): редакционные медиа — в том же бакете Object
    // Storage, что и UGC, через штатный адаптер, а не через Я.Диск с самописными
    // хуками. С disablePayloadAccessControl url записи указывает прямо на бакет:
    // бокс не хранит и не проксирует ни байта, /api/media/file/* не используется.
    //
    // Без `prefix` НАМЕРЕННО: поля url/sizes.*.url в схеме уже есть (снапшот
    // 20260705), а `prefix` добавил бы колонку → миграция (G192). Ключ объекта =
    // имя файла, ровно как залил sync-media-to-s3.yml.
    //
    // enabled только при заданных ключах: локальная разработка без S3 остаётся на
    // staticDir из Media.ts, плагин при enabled:false конфиг не трогает.
    s3Storage({
      enabled: Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY),
      bucket: process.env.S3_BUCKET || '',
      acl: 'public-read',
      disableLocalStorage: true,
      collections: { media: { disablePayloadAccessControl: true } },
      config: {
        endpoint: process.env.S3_ENDPOINT || 'https://storage.yandexcloud.net',
        region: process.env.S3_REGION || 'ru-central1',
        forcePathStyle: true, // как в lib/s3.ts: path-style, без виртуального хоста
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  ],
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
