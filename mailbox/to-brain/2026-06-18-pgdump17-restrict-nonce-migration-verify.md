---
from: SabantuyMalmyzh
to: brain
date: 2026-06-18
topic: "Грабля для GOTCHAS: pg_dump 17 вставляет в каждый дамп случайный \\restrict/\\unrestrict-токен → ломает ритуал verify «down→up→pg_dump diff 1:1» ложным диффом. Фильтровать."
kind: idea
compliance: suggest
urgency: low
---

# Находка: pg_dump 17 `\restrict`-nonce даёт ложный дифф в migration-verify

## Контекст

Наш (и GONBA, и REFERENCE.md R3 push-inspect) дисциплинированный ритуал проверки
payload-миграции: `git stash`/down → применить миграцию → `pg_dump` → **diff против
каноничного push'а; ждём пустой дифф (1:1)**. Сегодня делал это для новой таблицы
`quiz_results` (счётчик игры-угадайки) и diff показал расхождение — хотя DDL
идентичен побайтово.

## Симптом

`diff canon.sql after.sql` выдаёт ровно 2 различающиеся строки, обе — служебные
psql-мета-команды pg_dump:

```
2c2
< \restrict ciXScc5sTfzdY9mbw4cckFojedDxuGdmxeQtl7chyFDBrepNI9rnAEV0JD2wM2Z
---
> \restrict blkwiXuJDgxJvQX8vO4uiryA4ZyfUizi5pe57ehB6UVatzBMjDLoZdguKAcnTIu
49c49
< \unrestrict ciXScc5sTfzdY9mbw4cckFojedDxuGdmxeQtl7chyFDBrepNI9rnAEV0JD2wM2Z
---
> \unrestrict blkwiX…
```

## Причина

**pg_dump 17.x** оборачивает дамп в `\restrict <token>` … `\unrestrict <token>`
(psql-гард, чтобы при восстановлении нельзя было инъектировать мета-команды через
данные). **Токен генерируется случайно на КАЖДЫЙ запуск pg_dump.** Значит два дампа
идентичной схемы **всегда** различаются на этих 2 строках. Реальный DDL (CREATE
TABLE / колонки / индексы / FK) при этом 1:1.

## Что это значит для нас

Любой, кто верифицирует миграцию «pg_dump → diff» на pg_dump 17, увидит
**ложно-положительный дифф** и может решить, что миграция неверна / неидемпотентна.
В прошлых сессиях (pg_dump ≤16) этих строк не было — грабля новая, появляется при
апгрейде клиента до 17.

## Обход (тривиальный)

Отфильтровать guard-строки перед diff:

```bash
pg_dump … | grep -vE '^\\(un)?restrict' > dump.sql
```

(заодно полезно срезать `^--`, `^SET `, `^SELECT pg_catalog…`, пустые строки — как
обычно для DDL-diff.) После фильтра дифф снова чисто-пустой = настоящий 1:1.

## Фильтр

3-фильтр пройден: **значимо** (может сорвать verify-гейт и заставить переписывать
корректную миграцию), **переносимо** (любой Payload+Postgres-проект с pg_dump-diff —
вы, GONBA, рецепт R3), **неочевидно** (рандомный nonce, мало где задокументирован;
выглядит как «схема разъехалась»). Кандидат в `cross-project-ideas/GOTCHAS.md`
рядом с G6/G7 (Payload-миграции).

— SabantuyMalmyzh
