# SESSION_HANDOFF — sticky-note между сессиями

> Читается первым в начале сессии (после mailbox-check). Обновляется в конце сессии.
> История: `git log -- docs/SESSION_HANDOFF.md`.

---

**Статус:** IDLE
**Дата обновления:** 2026-06-04
**Веха:** M1 ✅ · M2 ✅ · усиление+фронт ✅ · **M3 деплой ✅ (PR #10) — сайт публично работает по HTTPS.** Дальше: домен/DNS/TLS, первый admin + контент, #017 миграции.

## Сделано

- **M1** (PR #1): каркас Next 15 + Payload 3.75.0 + Postgres, коллекции, доступ #015. Проверен **вживую**: admin создан, расписание видно на главной.
- **M2** (PR #3, **смержён в main**): публичная регистрация.
  - Страница события `/events/[slug]` (детали + форма заявки, когда `registrationEnabled`).
  - Клиентская форма → `POST /api/registrations`, галка согласия 152-ФЗ со ссылкой на политику.
  - Маршрут статических страниц `/[slug]` (рендер `Pages.content` через `RichText`).
  - Страница «Политика обработки ПДн» (slug `privacy`) — засеяна в `Pages`, ссылка в подвале.
  - **Hardening #015**: поля `status`/`source` заявки закрыты field-level access от подмены анонимом (`adminOrEditorField`).
  - **Серверный gate регистрации** — `beforeValidate`-хук `enforceRegistrationOpen`: анонимный `POST /api/registrations` отклоняется (400), если событие не `published` или `registrationEnabled !== true`; персонал не ограничен (телефонные заявки). Закрыл замечание ревью (прямой POST обходил UI-гейт). E2e через node: open→201, closed→400, bogus id→400.
  - **Email-уведомление** организатору — `afterChange`-хук `notifyOrganizer` (адрес из `ORGANIZER_EMAIL`; в dev пишется в консоль, на проде заработает с SMTP-адаптером).
  - Проверено зелёным: typecheck, lint, `next build`, и end-to-end через node (заявка / защита #015 / gate / отказ без согласия / public-read 403 / страницы рендерятся / email-хук логирует).
- **#016 read-аудит полей** (рекомендация brain) — ✅ прогнан, **чисто**. Публичный read только у `Media` (`anyone`: alt/caption — не PII) и published-доков `Events/Gallery/Pages` (черновики скрыты `authenticatedOrPublished`). `Registrations` read закрыт (#015), `Users` — `adminOrSelf` + `roles.update` заперт на admin. Чувствительных полей под публичным read нет; `admin.hidden`-as-security не обнаружено.
- **Пред-деплойное усиление** (PR #5, смержён):
  - **Rate-limit** публичного `POST /api/registrations` — хук `rateLimitRegistration` (beforeValidate, первым): 5 заявок / 10 мин на IP, только анонимы; персонал свободен. In-memory fixed-window (`lib/rateLimit.ts`) — для одно-инстансного VPS; при масштабе → Redis. IP из `X-Forwarded-For`/`X-Real-IP`.
  - **ISR** `revalidate=60` вместо `force-dynamic` на `/`, `/events/[slug]`, `/[slug]` + on-demand ревалидация (`revalidateEvent`/`revalidatePageDoc` на afterChange/afterDelete). `lib/safeRevalidate.ts` — перенос из GONBA. Серверный gate делает ISR безопасным.
  - **SEO**: `/sitemap.xml` (события+страницы, ревалидация 1ч) + `/robots.txt` (Disallow `/admin`,`/api`). ⚠️ оба в **app-root**, НЕ в route-group `(frontend)` (иначе robots не генерится — см. «Не делать»).
  - **Кастомная 404** (`not-found.tsx`).
  - E2e (node): robots/sitemap отдаются (6 url), rate-limit #1–5→400/#6→429 без строк в БД.
- **Полировка фронта** (PR #7, смержён): клиентский `ScheduleList` с чипами-фильтрами по категориям + категория-бейдж; hero-fallback (градиент) на детали события без изображения; `CATEGORY_LABELS` вынесен в `lib/categories.ts` (DRY). Render-smoke зелёный.
- **Письмо brain** (PR #6): `mailbox/to-brain/2026-06-03-nextjs-robots-route-group-gotcha.md` — грабля Next 15 (robots.ts в route-group не генерится), `kind=idea`/`suggest`, кандидат в GOTCHAS.

## Прод-деплой (M3 ✅ — PR #10, сессия 2026-06-04)

**Работает публично:** `http://1942c6fc87be.vps.myjino.ru` и **`https://…`** (jino отдаёт 443 своим `*.vps.myjino.ru` сертификатом). `/` и `/admin` → 200. БД пустая → расписание показывает пустое состояние (контент/admin завести — см. «Следующий шаг»).

**Сервер** (myjino VPS, Ubuntu 24.04, **1 vCPU / 1.5 GiB / без swap**):
- Доступ: **`ssh sabantuy`** (в `~/.ssh/config`): host `1942c6fc87be.vps.myjino.ru`, порт **49338** (внешний → внутр. sshd:22; запасной форвард 49348→22), user `valstan`, ключ `~/.ssh/id_ed25519_sabantuy` (изолированный #001), **sudo без пароля**. ⚠️ myjino ротирует host/port — при таймауте сверь в панели (G8).
- Стек: Node 22 (NodeSource) + pnpm 10 (corepack), PostgreSQL 17, nginx 1.30 (reverse-proxy `:80 → 127.0.0.1:3000`, ставит `X-Forwarded-For`/`X-Real-IP` для #005); certbot/ufw установлены, не настроены.
- БД: роль+БД `sabantuy` (`127.0.0.1:5432`), схема создана (21 таблица). Секреты — `/etc/sabantuy/sabantuy.env` (`root:valstan 0640`, systemd `EnvironmentFile=`): `DATABASE_URL`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL`, `ORGANIZER_EMAIL`, `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=127.0.0.1`.
- Сервис: `sabantuy.service` (systemd, `node server.js` из standalone, `MemoryMax=1024M`), релизы `~/sabantuy/releases/<sha>`, симлинк `~/sabantuy/current`.

**CI-деплой** (`.github/workflows/deploy-prod.yml`): push в `main` (или `workflow_dispatch`) → сборка standalone на ubuntu (+ эфемерный postgres-сервис для prerender) → tar → `scp` на сервер → распаковка в релиз → `systemctl restart sabantuy` → smoke `/`. Секреты репо: `secrets.SSH_PRIVATE_KEY` (= приватный `id_ed25519_sabantuy`), `vars.DEPLOY_SSH_HOST/PORT`, `vars.NEXT_PUBLIC_SERVER_URL` — заданы. На сервере для `git pull` — read-only deploy key `~/.ssh/github_sabantuy` (добавлен в репо).

**Почему сборка в CI, а не на боксе:** `next build` на 1.5 GiB = OOM (пик 1.5G/1.5G), swap в контейнере myjino запрещён. Поэтому собираем в CI, на сервер кладём только готовый standalone (рантайм ≈150–300 МБ).

## Локальное окружение (per-machine — `web/.env` в `.gitignore`)

⚠️ Локальный Postgres **зависит от машины** — порт и роль НЕ универсальны. Не считай 5432/5433 константой проекта: сверяйся со своим `web/.env` (он gitignored, на каждой машине свой) и со своими службами Postgres. Известные сетапы:

| Машина | Postgres | Доступ в `web/.env` | Демо-контент |
|---|---|---|---|
| где разрабатывался M2 | порт **5433** (общий инстанс) | выделенная роль/БД `sabantuy` (полные права владельца); пароль суперюзера `postgres` — в `../GONBA/web/.env` | 4 события (2 с регистрацией), `privacy`, 1 заявка |
| сессия 2026-06-03 (рядом БД `matricarmz_dev`) | порт **5432** (служба `postgresql-x64-17`) | БД `sabantuy` под суперюзером `postgres/postgres` | 3 события (1 с регистрацией), `privacy`, 1 тест-заявка |

> На машине 2026-06-03 в `DATABASE_URL` обязателен **`127.0.0.1`**, не `localhost`: `::1:5432` даёт `Permission denied (10013)` (IPv6-loopback), IPv4 работает.

Общее на всех машинах:
- **Dev-админ Payload:** `admin@sabantuy.local` / `SabantuyDev!2026` (роль admin). Если на твоей машине пароль иной — выровняй на этот через `payload run` (`payload.update` user, `overrideAccess`).
- **Запуск:** `corepack pnpm -C web dev` → http://localhost:3000 · `/admin`.
- **M2 e2e зелёный** (проверено на обеих машинах): заявка `open+valid`→201 · закрытое событие→400 · без согласия→400 · неизв. `event`→400 · anon `GET /api/registrations`→403 (PII, #015) · `/privacy`→200 · email-хук в консоль.

## Следующий шаг (по приоритету)

1. **Домен + TLS:** владелец привязывает `сабантуймалмыж.рф` в панели jino + DNS. Затем: `vars.NEXT_PUBLIC_SERVER_URL` → `https://<punycode>` + ре-деплой (значение бейкается в бандл при сборке); nginx `server_name` под домен; TLS — проверить, отдаёт ли jino-прокси 443 для **привязанного** домена (как для `*.vps.myjino.ru`); если нет — свой `certbot --nginx`.
2. **Первый admin на проде + контент:** зайти на `/admin` (экран create-first-user) и завести админа (пароль — свой, не dev-овский). Затем события, страница `privacy`, реальный текст «Политики обработки ПДн». Сейчас прод-БД пустая.
3. **⚠️ #017 миграции — ДО любого изменения схемы:** прод-рантайм **не** делает push (`push:true` гейтится `NODE_ENV=production` — см. «Не делать»). Первичная схема создана разовым dev-mode push. Любое изменение коллекций требует payload-миграций (`web/src/migrations/`) + применения на проде ДО деплоя (как у GONBA, ADR-0002/0003). Дать brain feedback (#017).
4. **SMTP email-адаптер** в `payload.config` + реальный `ORGANIZER_EMAIL` → уведомления о заявках на проде заработают (сейчас `No email adapter` → лог).
5. Опц.: deprecation `actions/setup-node@v4` (Node 20) → бампнуть; фронт (фильтр по дням, hero-изображения); rate-limit при масштабе → Redis.

## Открытые вопросы / решения для владельца

- Кто будет редактором-организатором (роль `editor`).
- Внешнее хранилище медиа (ADR-0001): подтвердить Я.Диск или иной провайдер.
- Punycode домена `сабантуймалмыж.рф` — при настройке DNS/nginx.
- Текст «Политики обработки ПДн» сейчас **шаблонный** (плейсхолдеры реквизитов оператора) — владелец должен заполнить реальными данными организатора.

## Не делать / тупиковые подходы

- `create-payload-app` в Claude Code не работает (TTY/clack, G10). Каркас — вручную по образцу GONBA.
- pnpm 11 несовместим — только pnpm 10 через corepack.
- **Next 15 metadata-файлы (`robots.ts`, `sitemap.ts`) держать в корне `app/`, НЕ в route-group `(frontend)`** — иначе `robots.txt` молча не генерится (sitemap «повезло», robots — нет). Грабля отправлена brain (PR #6).
- **`curl` в git-bash на Windows искажает кириллицу в теле запроса** (cp1251 вместо UTF-8) → авто-slug приходит пустым, заголовки — мусором. Для API-тестов с не-ASCII использовать **node fetch** (UTF-8), НЕ curl. Само приложение/`slugField` корректны (проверено). Плюс git-bash съедает ведущий `/` в `curl -w "%{...}"` (MSYS path-conversion) — коды верные, текст шаблона мусорный.
- **myjino VPS — контейнер, swap запрещён** (`swapon: Operation not permitted`). На 1.5 GiB `next build` (Payload) ловит OOM (пик 1.5G/1.5G). Не пытаться собирать на боксе и не лить swapfile — собирать в CI, на сервер только standalone-артефакт.
- **Payload `push:true` гейтится `NODE_ENV`** — в production push НЕ выполняется. Прод-рантайм схему не создаёт/не меняет. Первичную схему накатывать разовым `payload run` с `NODE_ENV=development`; дальнейшие изменения — миграции (#017). НЕ полагаться на рантайм-push в проде.
- **nginx на сервере — из репо `nginx.org` (mainline 1.30)**, его apt-репо отключён (`/etc/apt/sources.list.d/nginx.list.disabled`) из-за NO_PUBKEY — иначе падает `apt update` и за ним NodeSource-setup. Нужны апдейты nginx — добавить ключ и вернуть `.list`.
