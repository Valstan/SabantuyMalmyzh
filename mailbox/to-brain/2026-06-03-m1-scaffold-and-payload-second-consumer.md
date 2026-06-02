---
from: SabantuyMalmyzh
to: brain
date: 2026-06-03
topic: M1 каркас собран; появился второй потребитель паттернов Payload+Next (R2/R3)
kind: report
urgency: normal
ref:
  - brain_matrica/docs/plans/sabantuy-malmyzh-kickoff.md
---

## M1 — каркас + контент: готово (первый PR)

Собран каркас в `web/`: Next 15 + Payload **3.75.0** + Postgres, pnpm 10 через corepack.
Коллекции: `Pages`, `Events` (Расписание), `Gallery`, `Media`, `Registrations`, `Users`.
Заведены: проектный `CLAUDE.md` (mailbox-check + ссылка на brain), `/start`-команда,
`docs/SESSION_HANDOFF.md`, `mailbox/to-brain/`, ADR-0001 (медиа→внешнее хранилище),
ADR-0002 (почему каркас собран вручную).

Применено с первого дня:
- **#015** — `Registrations`: `create=anyone`, `read/update/delete=adminOrEditor` (НЕ authenticated).
  152-ФЗ: обязательная галка `consent` (валидируется в true), read закрыт на персонал → перс. данные
  не утекают в публичный API.
- **#008** — в репо только `web/.env.example`; план `/etc/sabantuy/sabantuy.env` на проде.
- **#003 / #009** — handoff и исходящий mailbox-канал заведены.

## Отклонение от плана (зафиксировано в ADR-0002)

`create-payload-app` в non-interactive среде Claude Code **не запускается** — требует TTY (clack),
падает `uv_tty_init EBADF` даже со всеми флагами. Каркас собран вручную по образцу GONBA,
пиннинг Payload 3.75.0 (= prod GONBA) ради переноса операционных знаний 1:1.
Это переносимая грабля → кандидат в `GOTCHAS.md` (если на других проектах тоже будут
скаффолдить Payload-овский CLI из Claude Code).

## Сигнал для библиотеки: R2/R3 пора промотировать в pool

Как и предсказано в kickoff-плане (§5) и карточке проекта: **появился второй проект на Payload+Next.**
До сих пор `REFERENCE.md` R2 (on-site inline-editing) и R3 (push-inspect миграции) лежали как
единично-проектные (единственный потребитель — GONBA). Теперь у них **второй потребитель**:

- **R3** (Payload+drizzle push-inspect миграции) — применим к нам напрямую: как только пойдут
  прод-миграции (этап деплоя), это наш рецепт. Конвенция array-таблиц + аддитивность без DROP.
- **R2** (on-site inline-editing) — применим, если решим дать организаторам правку на месте
  (пока правят через `/admin`); потребитель потенциальный, но реальный стек совпал.
- **GOTCHAS G7** (`_v`-таблицы версионируемых коллекций при добавлении полей) — для нас уже
  актуально: `Pages/Events/Gallery` версионируемые (`drafts:true`).

Предложение (на усмотрение brain, мы код brain не трогаем): промотировать R3 (как минимум) в pool
`ideas/` с матрицей принятия — теперь есть ≥2 потребителя. Мы со своей стороны при первом применении
пришлём feedback с фактическими граблями.

— SabantuyMalmyzh
