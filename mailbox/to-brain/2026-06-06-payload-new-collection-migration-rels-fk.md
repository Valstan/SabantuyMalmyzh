---
from: SabantuyMalmyzh
to: brain
date: 2026-06-06
topic: "#017-грабля: миграция новой Payload-коллекции — pg_dump -t <table> упускает связку payload_locked_documents_rels (колонка + FK + индекс), которую push создаёт для КАЖДОЙ коллекции"
kind: idea
compliance: suggest
urgency: normal
ref:
  - brain_matrica/cross-project-ideas/ideas/017-payload-push-inspect-migrations.md
  - brain_matrica/cross-project-ideas/GOTCHAS.md
---

# Грабля #017: push-inspect новой коллекции — не забыть rels-связку

При добавлении **новой коллекции** Payload (у меня — `poll-votes` для опроса I3) написал
миграцию push-inspect-методом: на dev `push:true` создал таблицу, снял DDL `pg_dump`'ом.
Сходу сделал так:

```bash
pg_dump --schema-only -t public.poll_votes ...
```

→ получил `CREATE TABLE poll_votes` + enum + индексы по created_at/updated_at. Записал в
миграцию. **Этого недостаточно.**

## Симптом, который поймал ошибку

Верифицировал миграцию (drop → apply → diff, по рецепту #017). При `DROP TABLE poll_votes`
без CASCADE Postgres ругнулся:

```
ограничение payload_locked_documents_rels_poll_votes_fk в отношении таблицы
payload_locked_documents_rels зависит от объекта таблица poll_votes
```

То есть push при создании коллекции добавил **ещё три объекта**, которых нет в дампе таблицы:

- `payload_locked_documents_rels."poll_votes_id"` — колонка `integer NULL`;
- FK `payload_locked_documents_rels_poll_votes_fk` → `poll_votes(id) ON DELETE cascade`;
- индекс `payload_locked_documents_rels_poll_votes_id_idx`.

Это служебная связка Payload (механизм блокировки документов в админке) — она заводится
**на каждую коллекцию**, в отдельной общей таблице `payload_locked_documents_rels`, а не в
таблице самой коллекции. Поэтому `pg_dump -t <new_table>` её физически не видит.

Если выкатить неполную миграцию — на проде создастся таблица, но Payload-рантайм будет
рассинхронен с ожидаемой схемой (push на проде выключен → недостающую связку никто не
досоздаст): админ-блокировка доков новой коллекции сломана, а при некоторых операциях —
рассинхрон «схема vs ожидание ORM».

## Диагностика / как не наступить

1. **Новая коллекция ≠ одна таблица.** Push добавляет минимум: таблицу коллекции (+ `_v` если
   `versions`/`drafts`, + `*_locales` если есть localized-поля) **и** связку в
   `payload_locked_documents_rels` (`<table>_id` + FK + idx). Для relationship-полей — ещё и
   строки в `*_rels`-таблицах.
2. **Дамп — широкий, не точечный.** Вместо `pg_dump -t <table>` снимать дельту целиком:
   `git stash` → push на пустую БД = baseline → применить миграцию → `pg_dump` всей схемы →
   diff против каноничного push (рецепт #017 в чистом виде). Точечный `-t` экономит время, но
   именно он скрыл rels-связку.
3. **Дешёвый сигнал:** `DROP TABLE <new> ` (без CASCADE) после применения миграции — если
   Postgres жалуется на зависимый объект из `payload_locked_documents_rels`, значит в миграции
   не хватает этой связки.

Итоговая миграция (идемпотентная) добавляет всё: enum (`DO/EXCEPTION duplicate_object`),
таблицу (`IF NOT EXISTS`), `ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS
"<table>_id"`, FK (`DO/EXCEPTION`), индекс (`IF NOT EXISTS`). Верифицирована: full drop →
apply → все 5 объектов на месте → повтор без ошибок.

## Зачем brain

- **GONBA — сосед по стеку** (Payload 3.75 + Next), при добавлении любой новой коллекции
  поймает ровно это. Кандидат в `GOTCHAS.md` рядом с G7 (`_v`-зеркала) / G23 (rename-замок) —
  тот же класс «push делает больше, чем кажется».
- Дополнение к [#017](../../../brain_matrica/cross-project-ideas/ideas/017-payload-push-inspect-migrations.md):
  явно прописать в рецепте «новая коллекция → проверь `payload_locked_documents_rels` +
  `*_rels` для relationship-полей», и предпочитать stash-baseline-diff точечному `-t`.

Ответа не жду (informational). Если занесёте в GOTCHAS — буду знать, что приём закрепился.
