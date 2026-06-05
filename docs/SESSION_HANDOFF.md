# SESSION_HANDOFF — sticky-note между сессиями

> Читается первым в начале сессии (после mailbox-check). Обновляется в конце сессии.
> История: `git log -- docs/SESSION_HANDOFF.md`.

---

**Статус:** localization RU/TT **выкачена на прод** (PR #17 смержён, миграция `20260604_160000` применена, деплой зелёный)
**Дата обновления:** 2026-06-05
**Веха:** M1 ✅ · M2 ✅ · усиление+фронт ✅ · M3 деплой ✅ · season-MVP «Программа» ✅ (PR #13) + «Карта» ✅ (PR #15) · **двуязычие RU/TT ✅ (код+миграция+ПРОД, PR #17) + перенос контента со старого WP ✅ (локально)**. Дальше: домен/DNS/TLS; первый admin + контент на проде; публичный язык-тумблер (когда появятся реальные TT-переводы).

> ✅ **brain sync прошёл в эту сессию** (`Already up to date`) — блок прошлой сессии (brain стоял на рабочей ветке) разрешён, репо вернулся на main. 3 входящих — все `feedback`/`suggest` (MAY), informational, обработаны.

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
- **Season-MVP #2 «Карта фестиваля»** (PR `feat/festival-map`): глобал `festival-map` (план-картинка `planImage` → media + `intro` + массив `points{label,type,note}`, типы: сцена/еда/вход/парковка/туалеты/медпункт/другое), публичная страница `/map` (план + легенда по типам с иконками, graceful-заглушка без картинки), nav-ссылка «Карта» в шапке. read=anyone (не PII), update=adminOrEditor. Миграция `20260604_140000` (push-inspect; fresh-create+идемпотентность проверены drop→up→up на public). Зелёным: typecheck/lint/`next build` (9/9 страниц), /map SSR-рендер легенды на сэмпле. Asset плана — теперь просто upload, не блокер.
- **Season-MVP #1 «Программа фестиваля»** (этот PR): brain `recommend`/`urgency:high` к сезону.
  - Поле **`venue`** (площадка/сцена) в `Events` — аддитивно к версионируемой коллекции (G7; dev push накатил чисто, прод #017 — без `DROP`).
  - Клиентский `ScheduleList`: **«● Идёт сейчас / Далее»** (часы на клиенте, тик 60с — не зависит от ISR-staleness; `live`=start≤now≤end, `next`=ближайшее будущее), баннер **«Сейчас на фестивале»**, фильтр-чипы по **площадкам** (2-е измерение к категориям), 🎪 площадка в карточке.
  - Зелёным: typecheck, lint, `next build`, e2e node (login→create published event с venue+live-слот→venue персистится, главная рендерит площадку/фильтр→cleanup). now/next-бейджи — client-only (progressive enhancement, в SSR-HTML нет — by design).
  - **Ack brain** + scope-решение по карте (#2, отложена — нет asset) + **архитектурное решение по localization** — `mailbox/to-brain/2026-06-04-season-mvp-program-ack-and-localization-decision.md`.
- **Двуязычие RU/TT** (ветка `feat/localization-tt-ru`, **на ревью, не смержена**): `localization` в `payload.config` (locales ru+tt, default+fallback ru). Локализованы user-facing текстовые поля: Events (title/summary/location/venue/content), Pages (title/content), Gallery (title/description), Media (alt/caption), FestivalMap (intro). **Массивы НЕ локализованы** (gallery.photos.caption, map points.label/note) — иначе медиа-связи дублируются по локалям (by design, MVP).
  - **Миграция `20260604_160000`** (#017 push-inspect): 8 зеркальных `*_locales` таблиц + enum `_locales` + `published_locale`/`snapshot` на `_v`; локализованные колонки переезжают из базовых/версионных таблиц. DDL снят `pg_dump`'ом с dev-push на пустую БД. **Верифицирована строго:** `git stash` → push на пустую БД = прод-эквивалент baseline → применил миграцию через `psql` → `pg_dump` → дифф против каноничного push сошёлся 1:1 (колонки/PK/уникальные индексы/FK), идемпотентна при повторе. Зелёным: typecheck, lint, `next build` (compile+prerender 9/9; standalone-symlink EPERM — Windows-only, CI/Linux ок).
  - **Публичный язык-тумблер отложён** до реальных TT-переводов (решение владельца): пока tt пуст, фронт отдаёт ru (fallback); cookie-locale убил бы ISR. Админка уже даёт ru/tt-селектор. Когда появятся переводы — добавить тумблер + locale-aware чтение во фронт-`payload.find`.
- **Перенос контента со старого WP** (`feat/localization-tt-ru`, локально): idempotent seed-портер `web/src/seed/seedFromWp.ts` (`payload run`) тянет с `сабантуймалмыж.рф` через WP REST API (node fetch, UTF-8 — G11): страницы «О фестивале» (`/o-sabantuy`), «Контакты» (`/kontakty`), плейсхолдер «Политика ПДн» (`/privacy`); фотоотчёт «Сабантуй 2023» (9 реальных фото → альбом `/gallery/sabantuy-2023`); афиша+программа 2024 (постеры → `/gallery/afisha-programma-2024`). Даты сохранены. Кириллица в именах файлов транслитерируется (иначе дедуп схлопывал постеры). Новый фронт `/gallery` (список + `/gallery/[slug]`) + nav-ссылки «Галерея/О фестивале/Контакты». Проверено в preview: все страницы 200, фото грузятся, консоль чистая, API `?locale=ru|tt` с ru-fallback. **Контент засеян только локально** — на проде запустить seed после первого admin (или вводить вручную).

## Прод-деплой (M3 ✅ — PR #10, сессия 2026-06-04)

**Работает публично:** `http://1942c6fc87be.vps.myjino.ru` и **`https://…`** (jino отдаёт 443 своим `*.vps.myjino.ru` сертификатом). `/` и `/admin` → 200. БД пустая → расписание показывает пустое состояние (контент/admin завести — см. «Следующий шаг»).

**Сервер** (myjino VPS, Ubuntu 24.04, **1 vCPU / 1.5 GiB / без swap**):
- Доступ: **`ssh sabantuy`** (в `~/.ssh/config`): host `1942c6fc87be.vps.myjino.ru`, user `valstan`, ключ `~/.ssh/id_ed25519_sabantuy` (изолированный #001), **sudo без пароля**. **Порты (сверено по панели 2026-06-04):** sshd VM = форвард **49348 → внутр. 22** (это и есть `valstan@`); **49338 = myjino-шлюз root** (не наш sshd). ⚠️ myjino ротирует host/port (G8).
- ⚠️ **SSH с локальной dev-машины к myjino может НЕ работать**, хотя VPS включён: edge myjino принимает TCP, но не отдаёт SSH-баннер на обоих портах (фильтр клиентского IP). При этом **раннер GitHub Actions достукивается** (другой IP). → DB-миграции и деплой гонять **через CI** (`apply-migration.yml` / `deploy-prod.yml`), не через локальный SSH. Это расширение G8.
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

> Машина сессии 2026-06-04 (localization): локальная БД **пересоздана** под localization-схему (drop+push) и засеяна портером `seedFromWp.ts` — 3 страницы (`o-sabantuy`/`kontakty`/`privacy`), 2 альбома галереи (13 фото). Dev-админ пересоздан портером. Прежний демо-контент перезатёрт. Чтобы повторить на любой машине: `corepack pnpm -C web payload run src/seed/seedFromWp.ts` (idempotent).

Общее на всех машинах:
- **Dev-админ Payload:** `admin@sabantuy.local` / `SabantuyDev!2026` (роль admin) — заводится автоматически портером `seedFromWp.ts`, если в БД нет ни одного пользователя. Если на твоей машине пароль иной — выровняй на этот через `payload run` (`payload.update` user, `overrideAccess`).
- **Запуск:** `corepack pnpm -C web dev` → http://localhost:3000 · `/admin`.
- **M2 e2e зелёный** (проверено на обеих машинах): заявка `open+valid`→201 · закрытое событие→400 · без согласия→400 · неизв. `event`→400 · anon `GET /api/registrations`→403 (PII, #015) · `/privacy`→200 · email-хук в консоль.

## Следующий шаг (по приоритету)

1. **Домен + TLS:** владелец привязывает `сабантуймалмыж.рф` в панели jino + DNS. Затем: `vars.NEXT_PUBLIC_SERVER_URL` → `https://<punycode>` + ре-деплой (значение бейкается в бандл при сборке); nginx `server_name` под домен; TLS — проверить, отдаёт ли jino-прокси 443 для **привязанного** домена (как для `*.vps.myjino.ru`); если нет — свой `certbot --nginx`.
2. **Первый admin на проде + контент:** зайти на `/admin` (экран create-first-user) и завести админа (пароль — свой, не dev-овский). Затем события (с **площадкой/тайм-слотами** под новую программу-фичу), страница `privacy`, реальный текст «Политики обработки ПДн». Сейчас прод-БД пустая.
3. **⚠️ #017 миграции — ДО любого изменения схемы:** прод-рантайм **не** делает push (`push:true` гейтится `NODE_ENV=production` — см. «Не делать»). Первичная схема создана разовым dev-mode push. Любое изменение коллекций требует payload-миграций (`web/src/migrations/`) + применения на проде ДО деплоя (как у GONBA, ADR-0002/0003). Дать brain feedback (#017).
   - **Фреймворк миграций заведён** (этот PR, по образцу GONBA): `web/src/migrations/` (`.ts` + зеркальный `.sql` + `index.ts`), скрипты `migrate`/`migrate:create`/`migrate:status`, **CI migration-guard** в `deploy-prod.yml` (падает, если в коммите новые миграции; обход — `workflow_dispatch` после ручного применения, G6).
   - **Первая миграция `20260604_120000`** — добавляет `events.venue` (+ `_events_v.version_venue`, G7). Имена/типы взяты push-inspect'ом из dev-БД; идемпотентна (`ADD COLUMN IF NOT EXISTS`).
   - **`20260604_120000` УЖЕ применена на проде** (2026-06-04) через workflow `apply-migration.yml` (см. ниже про SSH). Проверено: `events.venue`=1, `_events_v.version_venue`=1, записано в `payload_migrations`. Деплой кода прошёл (dispatch, guard пропущен).
   - **Рабочий поток для будущих миграций (накат ДО мержа):** `gh workflow run apply-migration.yml --ref <feature-branch> -f migration=<ts>` (накат по SSH из CI) → merge PR → авто-деплой падает на migration-guard (прод цел) → `gh workflow run deploy-prod.yml --ref main` (деплой кода, guard пропускается на dispatch).
     - ⚠️ **`--ref <feature-branch>` обязателен**, если миграцию катишь ДО мержа: `workflow_dispatch` без `--ref` чекаутит дефолтную ветку (`main`), где файла `web/src/migrations/<ts>.sql` ещё нет → шаг падает «Нет файла …». На сессии 2026-06-05 первый dispatch (без ref) упал ровно так; повтор с `--ref feat/localization-tt-ru` прошёл. Preflight (read-only SSH) при этом отрабатывает в обоих случаях — обманчиво. (Кандидат в #017/GOTCHAS — письмо brain отправлено.)
4. **SMTP email-адаптер** в `payload.config` + реальный `ORGANIZER_EMAIL` → уведомления о заявках на проде заработают (сейчас `No email adapter` → лог).
5. **Season-MVP #2 «Карта фестиваля»** — ✅ **выкачена на прод (PR #15)**. Глобал `festival-map` + `/map`; миграция `20260604_140000` применена через `apply-migration.yml`, деплой зелёный. Осталось наполнение: владелец загружает **план территории** (картинка) в `/admin` → раздел «Карта фестиваля» + добавляет объекты. До загрузки `/map` показывает заглушку.
6. **Localization TT/RU** — ✅ **выкачена на прод** (PR #17, сессия 2026-06-05). (а) Миграция `20260604_160000` применена на проде через `apply-migration.yml` (накат ДО мержа, #017-поток); прод-смоук вживую: `/`, `/admin`, `/gallery`, `/map`, `/api/events` → 200 (схема/код синхронны). Осталось: (б) **публичный язык-тумблер** — позже, когда появятся реальные TT-переводы (cookie/locale + locale-aware `payload.find`, осторожно с ISR); (в) открытый вопрос владельцу — кто переводит TT-контент.
7. Опц.: deprecation `actions/setup-node@v4` (Node 20) → бампнуть; фронт (hero-изображения событий через админку; фильтр по дням ✅ сделан); rate-limit при масштабе → Redis; **расширить deploy-smoke** с `/` на `/admin` + `/map` (#011 content-smoke) — сейчас деплой проверяет только `/`.

## Открытые вопросы / решения для владельца

- Кто будет редактором-организатором (роль `editor`).
- Внешнее хранилище медиа (ADR-0001): подтвердить Я.Диск или иной провайдер.
- Punycode домена `сабантуймалмыж.рф` — при настройке DNS/nginx.
- Текст «Политики обработки ПДн» сейчас **шаблонный** (плейсхолдеры реквизитов оператора) — владелец должен заполнить реальными данными организатора.
- **Тайм-слоты программы** (время/площадка событий) — орги вводят в `/admin` **до** мероприятия. Фича готова, контент — за владельцем.
- **Asset плана территории** для «Карты фестиваля» (season-MVP #2) — нужен от оргов.
- **Татарская версия (localization)** — подтвердить, что нужна, и кто переводит TT-контент (вручную). Архитектурно включается на M3.

## Не делать / тупиковые подходы

- `create-payload-app` в Claude Code не работает (TTY/clack, G10). Каркас — вручную по образцу GONBA.
- pnpm 11 несовместим — только pnpm 10 через corepack.
- **Next 15 metadata-файлы (`robots.ts`, `sitemap.ts`) держать в корне `app/`, НЕ в route-group `(frontend)`** — иначе `robots.txt` молча не генерится (sitemap «повезло», robots — нет). Грабля отправлена brain (PR #6).
- **`curl` в git-bash на Windows искажает кириллицу в теле запроса** (cp1251 вместо UTF-8) → авто-slug приходит пустым, заголовки — мусором. Для API-тестов с не-ASCII использовать **node fetch** (UTF-8), НЕ curl. Само приложение/`slugField` корректны (проверено). Плюс git-bash съедает ведущий `/` в `curl -w "%{...}"` (MSYS path-conversion) — коды верные, текст шаблона мусорный.
- **myjino VPS — контейнер, swap запрещён** (`swapon: Operation not permitted`). На 1.5 GiB `next build` (Payload) ловит OOM (пик 1.5G/1.5G). Не пытаться собирать на боксе и не лить swapfile — собирать в CI, на сервер только standalone-артефакт.
- **Payload `push:true` гейтится `NODE_ENV`** — в production push НЕ выполняется. Прод-рантайм схему не создаёт/не меняет. Первичную схему накатывать разовым `payload run` с `NODE_ENV=development`; дальнейшие изменения — миграции (#017). НЕ полагаться на рантайм-push в проде.
- **`drizzle-kit push` уходит в ИНТЕРАКТИВ на структурных правках** (напр. включение localization: колонки переезжают в `*_locales`). На непустой БД спрашивает «`snapshot` — новая колонка или rename `version_title`?» и **виснет на stdin** (в Claude Code / headless — мёртвый замок). Обход для генерации DDL: `DROP SCHEMA public CASCADE; CREATE SCHEMA public` → push на **пустую** БД создаёт схему без интерактива → `pg_dump -t <table>` снимает точный DDL для миграции. Верификация миграции: `git stash` → push пустую = baseline → применить миграцию `psql`'ом → `pg_dump` → дифф против каноничного push (письмо brain 2026-06-04, кандидат в #017/GOTCHAS).
- **nginx на сервере — из репо `nginx.org` (mainline 1.30)**, его apt-репо отключён (`/etc/apt/sources.list.d/nginx.list.disabled`) из-за NO_PUBKEY — иначе падает `apt update` и за ним NodeSource-setup. Нужны апдейты nginx — добавить ключ и вернуть `.list`.
