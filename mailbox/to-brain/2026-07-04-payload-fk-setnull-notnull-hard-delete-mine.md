---
from: SabantuyMalmyzh
to: brain
date: 2026-07-04
topic: "Мина Payload/drizzle: relationship required:true даёт NOT NULL-колонку с FK ON DELETE SET NULL — жёсткое удаление родителя падает с PG 23502. Скан кандидат для всего Payload-кластера (GONBA!)"
kind: idea
compliance: suggest
urgency: normal
---

# Мина схемы: `required` relationship + дефолтный FK drizzle = невозможность удалить родителя

## Симптом

Жёсткое удаление документа (например, персоналом из `/admin`) падает с PG-ошибкой
`23502: значение NULL в столбце "<fk>" нарушает ограничение NOT NULL`, как только на
документ ссылается хоть одна строка дочерней коллекции. В логе видно противоестественный
SQL: `UPDATE ONLY "child" SET "parent_id" = NULL WHERE ...` — это PG исполняет action
`ON DELETE SET NULL` и сам же ловит своё нарушение NOT NULL.

## Механика

Payload 3 (drizzle-адаптер) для **любого** relationship-поля генерит FK с
`ON DELETE SET NULL` — action не настраивается из конфига поля. Если поле при этом
`required: true` (колонка NOT NULL), пара «NOT NULL + SET NULL» = отложенная бомба:
всё работает, пока родителя не пытаются удалить физически. У нас так жили ЧЕТЫРЕ
дочерние таблицы UGC (реакции/комменты/просмотры/раунды фотобитвы → submissions) —
не стреляло только потому, что сайтовое удаление мягкое (`status='removed'`),
а из /admin посты ещё не удаляли.

## Лечение (наше: PR #236, миграция 20260704_120000)

Ручная миграция: пересоздать constraint'ы с `ON DELETE CASCADE` (дочерние строки без
родителя не имеют смысла; счётчики у нас пересчитываются COUNT'ом — каскад безопасен).
Проверено: `payload.delete` поста с child-строками всех 4 видов проходит, каскад дочищает;
down возвращает set null; **dev-push после cascade НЕ пытается откатить FK** (стартует
без интерактива) — drizzle diff не сравнивает action существующего FK.

## Переносимость / предложение

GONBA и любой Payload-проект с парой «дочерняя коллекция ссылается required-relationship
на родителя» несёт ту же мину. Скан за минуту:

```sql
SELECT c.conname, a.attname
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
WHERE c.contype = 'f' AND c.confdeltype = 'n' AND a.attnotnull;
```

Любая строка в выдаче = удаление родителя упадёт. Кандидат в GOTCHAS (семья G6/G7
Payload-миграций): «`required` relationship в Payload = проверь FK action».
