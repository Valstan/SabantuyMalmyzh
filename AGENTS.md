# AGENTS.md — единый канон для AI-агентов «Сабантуй в Малмыже»

Этот файл — **единственный канонический вход для любой нейросети**: Claude Code, Codex, Gemini CLI и любого будущего агента (ADR-0011). Адаптеры конкретных инструментов (`CLAUDE.md`, `GEMINI.md`) указывают сюда, но **не дублируют и не переопределяют** проектные правила: копия расходится с оригиналом молча (класс #087).

Первый файл, который агент читает в любой новой сессии этого проекта. Подсказывает, **где взять контекст** и **как правильно работать**.

Проект — пересборка сайта фестиваля «Сабантуй Малмыж» с WordPress на свой стек. Полный план, решения и вехи: [`../brain_matrica/docs/plans/sabantuy-malmyzh-kickoff.md`](../brain_matrica/docs/plans/sabantuy-malmyzh-kickoff.md). Реестровая карточка: [`../brain_matrica/projects/SabantuyMalmyzh.md`](../brain_matrica/projects/SabantuyMalmyzh.md).

---

## 📬 Mailbox check — ДО любой другой работы (asymmetric scheme, ADR-0001 v3)

SabantuyMalmyzh — под управлением meta-репо `brain_matrica` (`../brain_matrica/`). Идеи / директивы / вопросы brain ↔ проект ходят через **асимметричные mailbox'ы**: каждая сторона пишет **только в свой репо**. См. [ADR-0001 v3](../brain_matrica/adr/0001-brain-projects-mailboxes.md).

| Направление | Кто пишет | Где |
|---|---|---|
| `brain → SabantuyMalmyzh` | brain | `brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/*.md` — мы только **читаем**, в двух источниках (см. ниже) |
| `SabantuyMalmyzh → brain` | мы | **`mailbox/to-brain/*.md`** в этом репо (коммитим в свой через PR) |

### Синхронизировать можно ТОЛЬКО свой репозиторий (mandate владельца 2026-08-04)

`git fetch` / `pull --ff-only` / `checkout` — **только в `SabantuyMalmyzh`**. Соседние репозитории, включая `../brain_matrica/`, — **строго read-only**: никаких `fetch`, `pull`, `checkout` и любых иных синхронизирующих или изменяющих команд. Причина: brain (или другой агент) может одновременно работать в той же локальной копии и держать ещё не запушенную почту — синхронизация чужого дерева ломает чужую работу.

### Входящий mailbox читается из ДВУХ каналов

Набор писем = **объединение** двух read-only источников, сопоставление — по относительному пути каждого письма:

1. **локально:** `../brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/*.md` (как есть, без синхронизации);
2. **на GitHub `main`** репозитория `brain_matrica` — тот же путь, через API/веб, **без clone/fetch/pull**.

Правило свежести — **по каждому письму отдельно**, не по репозиторию в целом:

- письмо есть только в одном источнике → берём его;
- есть в обоих, содержимое совпадает → вопроса нет;
- есть в обоих, содержимое различается → **незакоммиченная локальная версия считается более свежей**; иначе сравниваем последний коммит **именно этого пути** локально и на GitHub. Порядок не определён однозначно → **прочитать обе версии, явно доложить конфликт, ничего не перезаписывать и не синхронизировать**.

Свежесть одного письма (или одного проекта) **не переносится** на другие письма и другие проекты.

### Шаги в начале каждой сессии (это и делает `/start`)

1. **Сканить** корень `from-brain/` в обоих каналах (**не** `DRAFTS/`, **не** `ARCHIVE/`), объединить и разрешить свежесть по правилу выше.
2. **Доложить** пользователю **до** чтения `docs/SESSION_HANDOFF.md`:
   ```
   📬 N писем от brain_matrica:
   - [high MUST]     2026-MM-DD-slug — short topic
   - [normal SHOULD] 2026-MM-DD-slug — short topic
   - [low MAY]       2026-MM-DD-slug — short topic
   ```
   `[urgency COMPLIANCE]`: **urgency** (`high`/`normal`/`low`) — когда читать; **COMPLIANCE** (`MUST`/`SHOULD`/`MAY`) — насколько обязательно. `urgency: high` упоминать отдельно даже если письмо одно.
3. **Retroactive** для писем без поля `compliance`: `kind: directive` → **MUST**, `kind: idea` → **SHOULD**.

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

Закоммитить **в свой репо через PR**. Brain заберёт письмо со своей стороны сам. См. [`mailbox/README.md`](mailbox/README.md).

В `ref:` ответного письма указывать **полный slug исходного письма** (`2026-08-08-ref-must-be-the-letter-slug`), а не номер идеи/граблю — иначе brain не связывает ответ с директивой и пингует повторно.

### Проактивный шеринг находок (pool #009)

Значимые **переносимые** находки (новый паттерн / обход бага фреймворка / security-приём) отправляю в `mailbox/to-brain/` с `kind=idea` **сам**, не дожидаясь запроса. 3-фильтр: значимость / переносимость / неочевидность. **Тишина = норма** (рутинный фикс / бамп / доменная правка → молчим).

### Что НЕЛЬЗЯ

- ❌ Писать/коммитить в `../brain_matrica/` что-либо **и синхронизировать его** (`fetch`/`pull`/`checkout`) — brain строго read-only.
- ❌ Писать в устаревшую `brain_matrica/mailboxes/SabantuyMalmyzh/to-brain/` — brain там не принимает.
- ❌ Архивировать `from-brain/*` — это забота brain'а в его репо.
- ❌ Писать письма другим проектам напрямую — идея в pool идёт письмом в свой `mailbox/to-brain/` с `kind=idea`.
- ❌ Пропускать mailbox-check в начале сессии.

### Sibling-репо: тактика — напрямую (ADR-0007 мозга, 2026-07-05)

Любой sibling-репо (`../<project>/`) можно **читать read-only напрямую** без письма мозгу (API-контракты, docs, SESSION_HANDOFF соседа). Читаем **как есть, без синхронизации** — `git pull` в чужом дереве запрещён (mandate 2026-08-04, см. §Синхронизировать можно ТОЛЬКО свой репозиторий). Нужна заведомо свежая версия — смотреть на GitHub через API/веб. Писать/коммитить в чужой репо по-прежнему нельзя; «пусть сосед сделает X» — только через мозг. **Построил зависимость от чужого API/формата → сообщить мозгу письмом** (прочитанное ≠ контракт).

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
| `web/src/access/` | Хелперы доступа: `anyone`, `adminOnly`, `adminOrEditor`, `adminOrSelf`, `authenticatedOrPublished` |
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

### Миграция схемы = три файла: `.ts` + `.sql` + `.json` (G192, mandate 2026-07-26)

Drizzle диффит **против последнего `.json`-снапшота рядом с миграциями**, а не против живой БД. Снапшота нет → «текущее состояние» считается пустым → `migrate:create` выдаёт схему с нуля и `down()` с `DROP TABLE … CASCADE` по всем таблицам, при этом файл валиден и правдоподобен. У нас так и было: 27 миграций, 0 снапшотов; автоген выдал 1270 строк с 73 `DROP TABLE … CASCADE` — на живом UGC это невосстановимо. Базлайн-снапшот заведён (`web/src/migrations/20260705_120000.json`).

**Дальше: `.json` коммитится вместе с каждой миграцией; `down()` читать глазами до применения.** Отдельно помнить: **initial-миграции у нас нет** (схема родилась `push`'ем на MVP) → цепочка НЕ воспроизводит схему с нуля, правда о схеме = конфиг + прод, сверка — read-only `probe-schema.yml`. Подробности и провенанс — [`web/src/migrations/README.md`](web/src/migrations/README.md).

### PR-only flow (cross-project, ADR-0002) + автономия под гейтами (pool #027)

**Никакого `git push origin main`.** Любое изменение — ветка → PR → merge. Префиксы: `feat/ fix/ chore/ docs/ refactor/`.

> Ярусы ниже — **правило проекта, а не настройка инструмента**. `.claude/settings.json` — лишь машиночитаемая форма для Claude Code; агент без такого файла соблюдает ярусы вручную: ярус `ask` = задать вопрос и дождаться явного ответа пользователя перед выполнением.

**Под директивой #027 (mandate 2026-06-06) человеческий «окей на дифф/мерж/деплой» заменён автоматическими гейтами** — см. `.claude/settings.json` (`defaultMode: auto`, коммитится). Ярусно по риску:

| Ярус | Режим | Гейт = подтверждение |
|---|---|---|
| Правки файлов, ветка, коммит, push ветки, PR, **авто-мерж** | **авто** | `corepack pnpm -C web typecheck` + `lint` (+ `build` для нетривиального) зелёные **и** CI зелёный |
| **Деплой на прод** (`deploy-prod.yml`, авто-триггер на merge в main + dispatch) | **авто** | встроенный smoke-check содержимого (#011/PR #23: `/`+`/map`+`/admin`) |
| Контент-сиды (`seed-prod`/`seed-culture`/`seed-program`) | **авто** | идемпотентны, без схемы/PII |
| **Накат миграций** (`apply-migration.yml`) | **`ask` — спрашивает** | дисциплина `--ref <feature-branch>` (G28) не выражается префикс-правилом → человек сверяет команду |
| **Необратимые прод-операции с данными** (versioned Payload только через API — G25; `DELETE`/`UPDATE` на живых данных) | **подтверждать в том же ходе** (#025) | **эту черту не пересекаем** — гейт остаётся человеческим |

**Ужесточено 2026-07-10** (прод живой: visitors VK, UGC-лента, подписчики, Media — условие #025/G25/G29 наступило): воркфлоу, мутирующие живые прод-данные или прод-env (`moderate-vk`, `apply-brand`, `apply-*-secrets`, `apply-domain-env`, `recover-*`, `setup-subdomain`), переведены в ярус **`ask`** наряду с миграциями (см. `.claude/settings.json`). Идемпотентные контент-сиды без PII и деплой — по-прежнему авто.

```bash
git checkout -b feat/<slug>
# работа, коммиты (авто)
corepack pnpm -C web typecheck && corepack pnpm -C web lint   # гейт-предпосылка
git push -u origin feat/<slug>                                # авто
gh pr create --title "..." --body "..."                       # авто
gh pr checks <n> --watch                                      # дождаться зелёного CI
gh pr merge --squash --delete-branch                          # авто-мерж (гейты зелёные)
git checkout main && git pull --ff-only
```

> Миграции схемы — **до** мержа: `gh workflow run apply-migration.yml --ref feat/<slug> -f migration=<ts>` (спросит подтверждение; **`--ref` обязателен**, иначе чекаут `main` без файла миграции — G28).

### Медиа → внешнее хранилище (план)

Фото/видео **не** отдаём с маленького VPS в пик сезона. Цель: фото → внешнее хранилище (приём GONBA Я.Диск), видео → встраивание плеером (Rutube/VK). MVP сейчас — локальный `staticDir` (`web/public/media/`, gitignored). Решение и план миграции: [`docs/adr/0001-media-external-storage.md`](docs/adr/0001-media-external-storage.md).

---

## Совместная работа нескольких агентов (ADR-0011)

Владелец открывает этот репозиторий разными нейросетями. Правила сосуществования:

- **Один агент — одна задача — своя ветка.** Два одновременно **пишущих** агента — только в отдельных `git worktree`; в одном рабочем дереве двух пишущих не запускать.
- **Не переключать ветку** в дереве, которым может пользоваться другой агент.
- **Незнакомые изменения в `git status` считай чужими:** не удалять, не форматировать попутно, не включать в свой коммит, не прятать в `stash`. Не понял, чьё — спроси.
- **Границы задачи объявлять в описании PR.** Пересеклись — второй ждёт merge первого и ребейзит свою ветку.
- **Межмодельная память — только Git/PR, `docs/SESSION_HANDOFF.md`, `mailbox/`.** Чат одной модели **не** источник истины для другой; после обрыва восстанавливать факты из Git/PR, а не по памяти (`/obriv`).

### Исполняемые памятки и правило перевода

Подробные пошаговые процедуры лежат в [`.claude/commands/`](.claude/commands/): [`start.md`](.claude/commands/start.md), [`close_session.md`](.claude/commands/close_session.md), [`obriv.md`](.claude/commands/obriv.md). Несмотря на имя каталога, **их workflow применим любому агенту**. Правило перевода в vendor-neutral:

- строку `allowed-tools:` в шапке — игнорировать;
- `/команда` = «выполни шаги этого файла»;
- указание вида «спроси через `AskUserQuestion`» = **«задай вопрос пользователю и дождись явного ответа»**;
- **форма любая, шаг обязателен** — предохранитель не снимается из-за того, что у агента нет конкретного инструмента. Это критично: у нас в памятках живут накат прод-миграций и модерация UGC (#025 / G25 / G29).

### Какие AI-файлы хранить в Git

**Коммитить:** `AGENTS.md` (канон), `CLAUDE.md` / `GEMINI.md` (тонкие адаптеры), `.claude/commands/`, `.claude/settings.json`, `docs/`, `mailbox/`, код.
**Не коммитить:** `.claude/settings.local.json` (персональные разрешения), кэши и сессии `.codex/` / `.gemini/`, `.env*`, ключи, токены, логи. Секретам не место в репозитории даже под `.gitignore`.

---

## Источники правды (читать в начале сессии)

| Файл | Что в нём |
|---|---|
| **`AGENTS.md`** (этот файл) | Единый канон правил проекта для любого агента. `CLAUDE.md`/`GEMINI.md` — тонкие адаптеры, правил не содержат. |
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
- **#001** изолированный SSH-deploy-ключ — ✅ `~/.ssh/id_ed25519_sabantuy` (M3, PR #10).
- **#011** deploy content-smoke-check — ✅ применено (PR #23: smoke `/`+`/map`+`/admin` в `deploy-prod.yml`).
- **#027** gate-replaced autonomy — ✅ применено (`.claude/settings.json` `auto` + ярусные гейты; mandate 2026-06-06). См. §PR-only flow.
- **Media → внешнее хранилище** — план (ADR-0001), MVP локально.

---

**В сомнениях — задай вопрос пользователю и дождись явного ответа. Не делай предположений на проде.**
