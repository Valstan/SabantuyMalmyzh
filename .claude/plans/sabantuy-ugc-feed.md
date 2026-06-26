# План: «Народная лента Сабантуя» — UGC фото/видео с лайками и комментами

> Заведён 2026-06-27. Фестиваль 4 июля 2026 (7 дней). Владелец одобрил: **полная лента сразу**,
> **постмодерация + «пожаловаться»**, **прямая загрузка**, хранилище **Yandex Object Storage (S3)**.

## Идея

Посетители снимают на телефон фото/короткие видео (подготовка к Сабантую и сам праздник),
выкладывают **прямо на сайте**, листают ленту (типа TikTok/VK), ставят лайки, комментируют,
делятся в соцсети. «Народный выбор» — топ по лайкам.

## Ключевой принцип безопасности для слабого бокса (1 vCPU, 1.5 ГБ, probe 2026-06-26)

**Медиа НЕ проходит через наш Node — ни на загрузке, ни на просмотре.**
- Загрузка: браузер → [наш API выдаёт presigned PUT URL, крошечный] → браузер PUT'ит файл **напрямую в S3**.
- Просмотр: лента — ISR/force-static (как `/sabantuy-2026`), медиа грузится **напрямую с S3** (CDN-инфра Яндекса).
- Наш бокс отдаёт только лёгкий кэшированный HTML/JSON. Стабильность к 4 июля (которую мы застраховали) держится.

## Хранилище: Yandex Object Storage (S3)

- SDK: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (presigned PUT).
- Endpoint `https://storage.yandexcloud.net`, region `ru-central1`, бакет public-read на префиксе `media/`.
- Ключ объекта: `media/<phase>/<yyyymm>/<uuid>.<ext>` (uuid выдаём при sign — до создания записи в БД).
- Публичный URL: `https://<bucket>.storage.yandexcloud.net/<key>` (в `next.config` remotePatterns).
- Env (в прод-env `/etc/sabantuy/sabantuy.env`, в репо — только `.env.example`-плейсхолдеры, #008):
  `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
  `S3_PUBLIC_BASE_URL` (опц., иначе деривируем), `UGC_MAX_PHOTO_MB`, `UGC_MAX_VIDEO_MB`, `UGC_MAX_VIDEO_SEC`.
- Настройка владельцем: см. `docs/ops/yandex-object-storage-setup.md`.

## Коллекции (паттерн PollVotes/QuizResults: `create: anyone` + rate-limit-хук + `ipHash` + field-access #015)

Все **НЕ versioned** (нет drafts) → нет `_v`-таблиц → обходим G7, проще миграция.

1. **`submissions`** — единица ленты.
   - Поля: `kind`(photo|video), `objectKey`, `posterKey`(опц. постер видео), `mime`, `bytes`,
     `width`/`height`/`durationSec`(опц. метаданные), `authorName`(≤64), `caption`(≤500),
     `phase`(preparation|festival), `consent`(checkbox, валидируется в true), `ipHash`(hidden),
     `userAgent`(hidden), `status`(visible|hidden|removed, default **visible** — постмодерация),
     `reportCount`(default 0), `hiddenReason`, `likeCount`(default 0), `commentCount`(default 0).
   - access: `create: anyone`; `read` — публично только `status=visible` (where-функция), персонал всё;
     `update/delete: adminOrEditor`. Field-access: `status/reportCount/likeCount/commentCount/ipHash/
     userAgent` — `update:()=>false` для анонима (анти-подмена; ставит сервер/хуки).
   - hooks: `beforeValidate: [rateLimitSubmission]` (лимит/IP, sanitize, consent=true, стоп-фильтр мата),
     `beforeChange`: проставить ipHash/userAgent/status='visible'.

2. **`submission-reactions`** — лайки (дедуп по ipHash).
   - Поля: `submission`(rel), `ipHash`(hidden). access: create anyone (rate-limit + дедуп beforeValidate:
     если есть реакция (submission, ipHash) → 409), read/update/delete adminOrEditor.
   - `afterChange`: `submission.likeCount += 1` (overrideAccess). `afterDelete`: −1.

3. **`submission-comments`** — комментарии (постмодерация, паттерн GONBA Messages).
   - Поля: `submission`(rel), `authorName`(≤64), `body`(≤1000), `ipHash`(hidden), `userAgent`(hidden),
     `status`(visible|hidden|removed default visible), `reportCount`, `hiddenReason`.
   - access как submissions. hooks: rate-limit + sanitize + анти-дубль; afterChange → `commentCount`.

4. **`content-reports`** — жалобы (постмодерация-предохранитель).
   - Поля: `targetType`(submission|comment), `targetId`(number), `reason`(опц.), `ipHash`(hidden).
   - access: create anyone (rate-limit + дедуп по (targetType,targetId,ipHash)), read/upd/del adminOrEditor.
   - `afterChange` (overrideAccess): инкремент `reportCount` цели; при `reportCount >= UGC_REPORT_HIDE_THRESHOLD`
     (напр. 3) → `status='hidden'` + `hiddenReason='авто: жалобы'`. Персонал разбирает в /admin.

## Эндпоинты

- **Кастомный:** `POST /api/ugc/sign-upload` (Next route handler `src/app/(frontend)/api/ugc/sign-upload/route.ts`):
  валидирует `kind`+`contentType`+заявленный размер (≤ лимита), генерит objectKey + **presigned PUT URL**
  (срок ~5 мин), rate-limit/IP. Возвращает `{ uploadUrl, objectKey, publicUrl }`. Файл через наш Node НЕ идёт.
- **Остальное — Payload REST** (наш идиом): `POST /api/submissions`, `/api/submission-reactions`,
  `/api/submission-comments`, `/api/content-reports` (все `create:anyone` + хуки). Никаких кастом-роутов.

## Фронт

- **Лента** `/lenta`(+`/tt/lenta`): `force-static` + `revalidate=30` (новое видно ≤30с; медиа с S3 → бокс не грузится).
  Сетка/вертикаль одобренных (`status=visible`), сортировка **Новое / Народный выбор (по likeCount)**,
  фильтр фаз **Подготовка / Праздник**. Карточка: медиа (фото `<img>` с S3; видео `<video>` click-to-play,
  **без автоплея**, постер), автор, подпись, кнопка лайка (оптимистичный bump, как quiz), число комментов,
  кнопка «поделиться» (Web Share, как `QuizGame`), кнопка «пожаловаться».
- **Загрузка** (модалка/страница, клиент): выбор файла (`capture` на телефоне) → клиентская валидация
  (тип, размер, для видео — длительность через `<video>.duration` ≤ лимита; фото — даунскейл canvas для
  экономии трафика) → `sign-upload` → PUT в S3 с прогрессом → `POST /api/submissions` (objectKey, caption,
  author, phase, consent). Галка согласия (152-ФЗ + «контент мой/приемлемый») со ссылкой на /privacy.
- i18n (`lib/i18n.ts`), навигация, JSON-LD опц., CSS.

## Постмодерация — предохранители (выбор владельца: контент виден сразу)

Согласие+аффирмация при загрузке · «пожаловаться»→авто-скрытие на пороге · мгновенное скрытие/удаление в
/admin · rate-limit от флуда · анти-дубль · простой стоп-фильтр мата · лимиты размера/длины видео.
⚠️ Остаточный риск для семейного/детского контекста — рекомендовать модератора онлайн в день праздника.

## Миграция

Новые таблицы (`submissions`, `submission_reactions`, `submission_comments`, `content_reports`) + enum'ы
(`kind`, `phase`, статусы). Non-versioned → без `_v`. Hand-author push-inspect (R3/R10/G81). Накат
`apply-migration.yml --ref <feature-branch>` ДО мержа (G28, ask-гейт), затем deploy-prod --ref main (#017).

## Последовательность PR

- **PR1 (foundation):** deps `@aws-sdk/*` + `lib/s3.ts` (клиент+presign) + `POST /api/ugc/sign-upload` +
  `.env.example` + `next.config` remotePattern. _Тестируемо: подпись URL с dummy-ключами; живой аплоад — после ключей владельца._
- **PR2:** коллекция `submissions` + миграция + хуки (rate-limit/sanitize/consent) + регистрация в конфиге.
- **PR3:** `submission-reactions` + `submission-comments` + `content-reports` + хуки (дедуп/счётчики/авто-скрытие) + миграция.
- **PR4:** лента `/lenta`(+tt) ISR force-static + рендер медиа с S3 + сортировки/фильтр-фаз + nav + i18n.
- **PR5:** UI загрузки (presign→PUT→submit, согласие, клиент-валидация, camera) + лайк/коммент/жалоба UI + Web Share.
- **PR6:** полировка + прод-роллаут (migration --ref → deploy → smoke) + письмо brain (это их идея #4/I8 «VK-UGC/фотостена», делаем раньше; + переносимый паттерн presigned-direct-S3-UGC на слабом боксе).

## Риски / зависимости

- **Критпуть:** владелец настраивает S3 (бакет+ключ+CORS+public-read) — без этого живой аплоад не работает.
  Код PR1–PR5 пишу параллельно; e2e-смоук на проде после ключей.
- **Юр./152-ФЗ:** постмодерация → предохранители выше + рекомендация модератора.
- **Стоимость:** egress S3 — держим anti-autoplay/постеры/лимиты; мониторить.
- **Запуск за 7 дней до пика:** лента изолирована от ядра, медиа на S3, фид ISR-кэширован → нагрузка на бокс
  near-zero. Софт-запуск на фазе «подготовка» = обкатка до 4 июля.
