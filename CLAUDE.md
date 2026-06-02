# CLAUDE.md — entry point для AI-сессий «Сабантуй Малмыж»

Первый файл, который Claude читает в любой новой сессии этого проекта. Подсказывает, **где взять контекст** и **как правильно работать**.

Проект — пересборка сайта фестиваля «Сабантуй Малмыж» с WordPress на свой стек. Полный план, решения и вехи: [`../brain_matrica/docs/plans/sabantuy-malmyzh-kickoff.md`](../brain_matrica/docs/plans/sabantuy-malmyzh-kickoff.md). Реестровая карточка: [`../brain_matrica/projects/SabantuyMalmyzh.md`](../brain_matrica/projects/SabantuyMalmyzh.md).

---

## 📬 Mailbox check — ДО любой другой работы (asymmetric scheme, ADR-0001 v3)

SabantuyMalmyzh — под управлением meta-репо `brain_matrica` (`../brain_matrica/`). Идеи / директивы / вопросы brain ↔ проект ходят через **асимметричные mailbox'ы**: каждая сторона пишет **только в свой репо**. См. [ADR-0001 v3](../brain_matrica/adr/0001-brain-projects-mailboxes.md).

| Направление | Кто пишет | Где |
|---|---|---|
| `brain → SabantuyMalmyzh` | brain | `brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/*.md` (мы только **читаем** через `git pull --ff-only`) |
| `SabantuyMalmyzh → brain` | мы | **`mailbox/to-brain/*.md`** в этом репо (коммитим в свой через PR) |

### Шаги в начале каждой сессии (это и делает `/start`)

1. **Sync brain (read-only):** `cd ../brain_matrica && git pull --ff-only && cd -`
2. **Сканить** `../brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/*.md` (только корень — **не** `DRAFTS/`, **не** `ARCHIVE/`).
3. **Доложить** пользователю **до** чтения `docs/SESSION_HANDOFF.md`:
   ```
   📬 N писем от brain_matrica:
   - [high MUST]     2026-MM-DD-slug — short topic
   - [normal SHOULD] 2026-MM-DD-slug — short topic
   - [low MAY]       2026-MM-DD-slug — short topic
   ```
   `[urgency COMPLIANCE]`: **urgency** (`high`/`normal`/`low`) — когда читать; **COMPLIANCE** (`MUST`/`SHOULD`/`MAY`) — насколько обязательно. `urgency: high` упоминать отдельно даже если письмо одно.
4. **Retroactive** для писем без поля `compliance`: `kind: directive` → **MUST**, `kind: idea` → **SHOULD**.

### Реакция по compliance

| compliance | RFC 2119 | Действие |
|---|---|---|
| `mandate` | MUST | Применить безусловно. Технически невозможно → `mailbox/to-brain/` с `kind=feedback`, `urgency=high`, конкретный блокер. |
| `recommend` | SHOULD | Применить (можно с адаптацией). Совсем не подходит → письмо с обоснованием отказа. Молчать нельзя. |
| `suggest` | MAY | По усмотрению. Применил — feedback приветствуется. Отложил — молча. |

### Чтобы написать brain (исходящие — в свой репо)

Создать `mailbox/to-brain/YYYY-MM-DD-slug.md` **в этом репо** (НЕ в `brain_matrica/`):

```yaml
---
from: SabantuyMalmyzh
to: brain
date: YYYY-MM-DD
topic: ...
kind: idea | directive | question | feedback | report
compliance: suggest | recommend | mandate   # required для kind=idea и kind=directive
urgency: low | normal | high
ref:
  - brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/<filename>.md   # если отвечаешь
---
```

Закоммитить **в свой репо через PR**. Brain прочитает через `git pull --ff-only` со своей стороны. См. [`mailbox/README.md`](mailbox/README.md).

### Проактивный шеринг находок (pool #009)

Значимые **переносимые** находки (новый паттерн / обход бага фреймворка / security-приём) отправляю в `mailbox/to-brain/` с `kind=idea` **сам**, не дожидаясь запроса. 3-фильтр: значимость / переносимость / неочевидность. **Тишина = норма** (рутинный фикс / бамп / доменная правка → молчим).

### Что НЕЛЬЗЯ

- ❌ Писать/коммитить в `../brain_matrica/` что-либо (brain — **read-only** для этой сессии; только `git pull --ff-only`).
- ❌ Писать в устаревшую `brain_matrica/mailboxes/SabantuyMalmyzh/to-brain/` — brain там не принимает.
- ❌ Архивировать `from-brain/*` — это забота brain'а в его репо.
- ❌ Писать письма другим проектам напрямую — идея в pool идёт письмом в свой `mailbox/to-brain/` с `kind=idea`.
- ❌ Пропускать mailbox-check в начале сессии.

### Consult-library reflex (pool #014) — по условному триггеру, не на каждый /start

Перед вводом нового инструмента/паттерна или при незнакомой грабле — заглянуть в библиотеку Мозга: [`cross-project-ideas/INDEX.md`](../brain_matrica/cross-project-ideas/INDEX.md) (pool), [`GOTCHAS.md`](../brain_matrica/cross-project-ideas/GOTCHAS.md) (грабли по симптому), [`REFERENCE.md`](../brain_matrica/cross-project-ideas/REFERENCE.md) (рецепты Payload+Next от GONBA — R2 on-site editing, R3 push-inspect миграции). **Особенно** GOTCHAS G6/G7 (Payload-миграции) — мы второй Payload-проект.

---

## Стек и структура

- **Next.js 15 + Payload CMS 3.75.0 + PostgreSQL** (TypeScript). Зеркало стека GONBA — операционные знания переносятся 1:1.
- **Package manager: pnpm 10 через corepack** (`corepack pnpm …`). **НЕ pnpm 11** (несовместим, как у GONBA). Активация: `corepack prepare pnpm@10.15.0 --activate`.
- Приложение живёт в **`web/`** (как у GONBA). Команды запускать из `web/`: `corepack pnpm -C web <script>`.
- Деплой (systemd + nginx + GitHub Actions) — **настроить, когда владелец поднимет VPS** (jino cloud, Ubuntu 24.04, SSH `sabantuy`, порт 49338).

### Карта `web/`

| Путь | Что |
|---|---|
| `web/src/payload.config.ts` | Конфиг Payload: postgres-адаптер (`push:true` в dev), коллекции, lexical, i18n ru |
| `web/src/collections/` | `Pages`, `Events` (Расписание), `Gallery`, `Media`, `Registrations`, `Users` |
| `web/src/access/` | Хелперы доступа: `anyone`, `adminOnly`, `adminOrEditor`, `adminOrSelf`, `authenticated`, `authenticatedOrPublished` |
| `web/src/app/(payload)/` | Сгенерённая Payload-обвязка админки (`/admin`, `/api`) — `importMap.js` регенерится `generate:importmap` |
| `web/src/app/(frontend)/` | Публичный фронт (home = расписание) |
| `web/.env.example` | Шаблон env. Реальные значения — `web/.env` (gitignored) локально / `/etc/sabantuy/sabantuy.env` на проде (#008) |

### Первый запуск локально

```bash
corepack prepare pnpm@10.15.0 --activate
corepack pnpm -C web install
cp web/.env.example web/.env        # подставить DATABASE_URL и PAYLOAD_SECRET
corepack pnpm -C web generate:importmap   # заполнить importMap под фактический конфиг
corepack pnpm -C web generate:types       # сгенерить src/payload-types.ts
corepack pnpm -C web dev                   # http://localhost:3000  ·  /admin
```

> Нужен локальный PostgreSQL с БД `sabantuy`. `push:true` накатит схему при первом старте.
> Скрипты используют `cross-env` для `NODE_OPTIONS` → работают и на Windows без bash-shell.

---

## Правила, которые НЕ менять

### Серверный write-authz = персонал, не «authenticated» (pool #015) — с первого дня

Коллекция `Registrations`: `create` — публичный (заявка с сайта), `read/update/delete` — **только `adminOrEditor`**. НЕ «любой authenticated». Это ровно дыра, которую GONBA закрыла 2026-06-02: будущие end-user аккаунты не должны читать чужие перс. данные в обход UI. **При добавлении любой коллекции с записью — серверный access сужать до явных ролей**, и он должен 1:1 совпадать с клиентским edit-гейтом. `admin.hidden` — это **не** API-security (см. письмо GONBA 2026-06-03): чтобы поле не утекало в публичный API, нужен field-level `access.read`.

### 152-ФЗ (персональные данные)

`Registrations` содержит ФИО/контакты → обязательная галка `consent` (валидируется в true) + ссылка на политику обработки ПДн (страница в `Pages`). Хранение в РФ (jino = РФ). `read` коллекции закрыт на персонал → в публичный API данные не утекают.

### Секреты вне репозитория (pool #008)

В репо — только `web/.env.example`. Локально — `web/.env` (в `.gitignore`). На проде — `/etc/sabantuy/sabantuy.env` (root:0640) + systemd `EnvironmentFile=`. Токены/пароли никогда не коммитим и не пишем в чат.

### PR-only flow (cross-project, ADR-0002)

**Никакого `git push origin main`.** Любое изменение — ветка → PR → merge. Префиксы: `feat/ fix/ chore/ docs/ refactor/`. Merge `--squash` по умолчанию, только после явного OK пользователя на diff.

```bash
git checkout -b feat/<slug>
# работа, коммиты
git push -u origin feat/<slug>
gh pr create --title "..." --body "..."
# показать diff → дождаться OK → gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
```

### Медиа → внешнее хранилище (план)

Фото/видео **не** отдаём с маленького VPS в пик сезона. Цель: фото → внешнее хранилище (приём GONBA Я.Диск), видео → встраивание плеером (Rutube/VK). MVP сейчас — локальный `staticDir` (`web/public/media/`, gitignored). Решение и план миграции: [`docs/adr/0001-media-external-storage.md`](docs/adr/0001-media-external-storage.md).

---

## Источники правды (читать в начале сессии)

| Файл | Что в нём |
|---|---|
| [`docs/SESSION_HANDOFF.md`](docs/SESSION_HANDOFF.md) | Sticky-note прошлой сессии: статус, текущая нитка, следующий шаг. **Читать первым.** |
| [`docs/adr/`](docs/adr/) | Per-project ADR — **почему** так (media-storage, scaffold; deploy — позже). |
| [`mailbox/`](mailbox/) | Исходящая почта в brain (asymmetric scheme). См. §📬 выше. |
| [`../brain_matrica/`](../brain_matrica/) | Meta-репо стратегии (план, pool идей, GOTCHAS, реестр, mailboxes). **Read-only.** |
| [`../GONBA/`](../GONBA/) | Референс-проект на том же стеке (деплой, конфиги, паттерны Payload). |

---

## Применённые / запланированные идеи из pool

- **#015** server write-authz vs UI edit-gate — ✅ применено с первого дня (`Registrations`).
- **#008** секреты вне репо — ✅ `.env.example` only; план `/etc/sabantuy/` на проде.
- **#003** SESSION_HANDOFF — ✅ заведён.
- **#009** share-findings reflex — ✅ канал `mailbox/to-brain/` заведён.
- **#001** изолированный SSH-deploy-ключ — план (на этапе деплоя, когда будет VPS).
- **#011** deploy content-smoke-check — план (на этапе CI/CD).
- **Media → внешнее хранилище** — план (ADR-0001), MVP локально.

---

**В сомнениях — спроси пользователя через `AskUserQuestion`, не делай предположений на проде.**
