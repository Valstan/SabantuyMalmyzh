import type { CollectionConfig } from 'payload'

import { adminOrEditor } from '../access/adminOrEditor'
import { adminOrEditorField } from '../access/adminOrEditorField'
import { anyone } from '../access/anyone'
import { publicVisibleOrStaff } from '../access/publicVisibleOrStaff'
import { rateLimitSubmission } from '../hooks/rateLimitSubmission'
import { stampSubmissionMeta } from '../hooks/stampSubmissionMeta'
import { UGC_MAX_AUTHOR, UGC_MAX_CAPTION } from '../lib/ugc'

// «Народная лента» (UGC): фото/видео, снятые посетителями и выложенные прямо на сайте.
// Одна строка = одна публикация. Медиа НЕ хранится здесь и НЕ идёт через наш бокс —
// в записи лежит только ключ объекта в Object Storage (objectKey), браузер тянет файл
// напрямую с S3 (см. .claude/plans/sabantuy-ugc-feed.md).
//
// ⚠️ pool #015 (server write-authz vs UI edit-gate):
//   create = публичный (посетитель выкладывает с сайта)
//   read   = публично ТОЛЬКО status='visible' (постмодерация; скрытое/удалённое в
//            публичный API не утекает), персонал видит всё
//   update/delete = ТОЛЬКО персонал (admin||editor)
//   Служебные поля (status/счётчики/ipHash/userAgent/hiddenReason) закрыты field-access
//   на запись анонимом (анти-подмена) — их ставит сервер/хуки.
//
// ⚠️ 152-ФЗ: обязательная галка consent (валидируется в true) — посетитель подтверждает
//   согласие и что контент его/приемлем. Личные данные минимизированы: имя автора —
//   опционально и свободной формой; IP не храним, только необратимый хеш (дедуп абьюза).
//
// Постмодерация (выбор владельца — контент виден сразу): предохранители — rate-limit +
// стоп-фильтр мата (хук), «пожаловаться» → авто-скрытие на пороге (PR3 content-reports),
// мгновенное скрытие/удаление в /admin. НЕ versioned (нет drafts) → нет `_v` (обход G7).
export const Submissions: CollectionConfig<'submissions'> = {
  slug: 'submissions',
  labels: {
    singular: 'Публикация (лента)',
    plural: 'Народная лента',
  },
  access: {
    create: anyone,
    read: publicVisibleOrStaff,
    update: adminOrEditor,
    delete: adminOrEditor,
  },
  admin: {
    defaultColumns: ['kind', 'status', 'authorName', 'phase', 'likeCount', 'reportCount', 'createdAt'],
    useAsTitle: 'authorName',
    description:
      'Фото/видео от посетителей. Постмодерация: видно сразу, скрывайте/удаляйте здесь при жалобах. Медиа хранится в Object Storage (objectKey), не на боксе.',
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      label: 'Тип',
      required: true,
      options: [
        { label: 'Фото', value: 'photo' },
        { label: 'Видео', value: 'video' },
      ],
    },
    {
      name: 'objectKey',
      type: 'text',
      label: 'Ключ объекта (S3)',
      required: true,
      unique: true,
      admin: { description: 'media/<phase>/<yyyymm>/<uuid>.<ext> — путь файла в бакете.' },
    },
    {
      name: 'posterKey',
      type: 'text',
      label: 'Ключ постера видео (S3)',
      admin: { description: 'Опц. кадр-обложка для видео.' },
    },
    {
      name: 'mime',
      type: 'text',
      label: 'MIME-тип',
      required: true,
    },
    {
      name: 'bytes',
      type: 'number',
      label: 'Размер (байт)',
      min: 0,
    },
    {
      name: 'width',
      type: 'number',
      label: 'Ширина (px)',
      min: 0,
    },
    {
      name: 'height',
      type: 'number',
      label: 'Высота (px)',
      min: 0,
    },
    {
      name: 'durationSec',
      type: 'number',
      label: 'Длительность видео (с)',
      min: 0,
    },
    {
      name: 'authorName',
      type: 'text',
      label: 'Имя автора',
      maxLength: UGC_MAX_AUTHOR,
    },
    {
      name: 'caption',
      type: 'textarea',
      label: 'Подпись',
      maxLength: UGC_MAX_CAPTION,
    },
    {
      name: 'phase',
      type: 'select',
      label: 'Фаза',
      required: true,
      defaultValue: 'preparation',
      options: [
        { label: 'Подготовка', value: 'preparation' },
        { label: 'Праздник', value: 'festival' },
      ],
    },
    {
      name: 'consent',
      type: 'checkbox',
      label: 'Согласие (152-ФЗ + контент мой/приемлемый)',
      required: true,
      validate: (value: unknown) =>
        value === true || 'Без согласия опубликовать нельзя.',
      admin: { description: 'Обязательно. Посетитель подтверждает при загрузке.' },
    },

    // --- служебные поля: пишет сервер/хуки, аноним их задать не может (#015) ---
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      defaultValue: 'visible',
      // Постмодерация: по умолчанию видно. Меняет только персонал (или авто-скрытие
      // хуком жалоб в PR3 через overrideAccess).
      access: {
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      options: [
        { label: 'Видно', value: 'visible' },
        { label: 'Скрыто', value: 'hidden' },
        { label: 'Удалено', value: 'removed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'hiddenReason',
      type: 'text',
      label: 'Причина скрытия',
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'likeCount',
      type: 'number',
      label: 'Лайков',
      defaultValue: 0,
      // Публично читаемо (лента показывает счётчик), но пишет только сервер (PR3 хуки).
      access: {
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'commentCount',
      type: 'number',
      label: 'Комментариев',
      defaultValue: 0,
      access: {
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'viewCount',
      type: 'number',
      label: 'Просмотров',
      defaultValue: 0,
      // Публично читаемо (лента показывает счётчик), пишет только сервер (recountViews).
      access: {
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'battleWins',
      type: 'number',
      label: 'Побед в Фотобитве',
      defaultValue: 0,
      // Счёт игры «Фотобитва» — ОТДЕЛЬНО от likeCount. Пишет только сервер (recountBattle).
      access: {
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'battleShows',
      type: 'number',
      label: 'Показов в Фотобитве',
      defaultValue: 0,
      access: {
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'reportCount',
      type: 'number',
      label: 'Жалоб',
      defaultValue: 0,
      // Не раскрываем публично число жалоб (read закрыт на персонал).
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'ipHash',
      type: 'text',
      label: 'IP-хеш',
      // Не PII (необратимый хеш), но публично не отдаём — служебное поле дедупа/абьюза.
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { hidden: true },
    },
    {
      name: 'ownerHash',
      type: 'text',
      label: 'Владелец (хеш токена браузера)',
      // Хеш браузерного ownerToken — по нему автор удаляет/правит «своё» (PR3 /api/ugc/*).
      // Не PII, публично не отдаём; ставит хук на создании (анонимом не задаётся).
      index: true,
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { hidden: true },
    },
    {
      name: 'ownerVisitor',
      type: 'number',
      label: 'Владелец (VK-аккаунт)',
      // PK строки visitors — по нему автор управляет «своим» с ЛЮБОГО устройства (VK-вход,
      // PR5B). Ставит хук из сессии-cookie на создании; анонимом/посетителем не задаётся.
      index: true,
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { hidden: true },
    },
    {
      name: 'userAgent',
      type: 'text',
      label: 'User-Agent',
      access: {
        read: adminOrEditorField,
        create: adminOrEditorField,
        update: adminOrEditorField,
      },
      admin: { hidden: true },
    },
  ],
  hooks: {
    // rateLimit/санитайз/валидация первым; затем проставление ipHash/userAgent.
    beforeValidate: [rateLimitSubmission],
    beforeChange: [stampSubmissionMeta],
  },
  timestamps: true,
}
