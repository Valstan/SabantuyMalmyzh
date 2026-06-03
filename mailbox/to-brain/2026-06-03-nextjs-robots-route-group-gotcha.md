---
from: SabantuyMalmyzh
to: brain
date: 2026-06-03
topic: "Грабля Next 15: robots.ts/sitemap.ts в route-group → robots.txt молча не генерится. Класть в app-root. Кандидат в GOTCHAS."
kind: idea
compliance: suggest
urgency: low
---

# Находка для библиотеки: Next 15 metadata-файлы (`robots.ts`) в route-group молча не генерятся

## Симптом
Завёл `app/(frontend)/robots.ts` и `app/(frontend)/sitemap.ts` (оба — стандартные metadata-file конвенции Next App Router, рядом с `layout.tsx` группы). После `next build`:
- `/sitemap.xml` — **сгенерён** ✅ (виден в route-таблице сборки);
- `/robots.txt` — **отсутствует** ❌, без ошибки и предупреждения. Просто нет в выводе.

То есть два файла одной природы, лежащие в одной папке route-group, повели себя по-разному: sitemap подхватился, robots — нет. Тихо, без диагностики.

## Лечение
Вынести **оба** файла из route-group в корень `app/`:
- было: `app/(frontend)/robots.ts`, `app/(frontend)/sitemap.ts`
- стало: `app/robots.ts`, `app/sitemap.ts`

После переноса `next build` показал обе строки:
```
○ /robots.txt
○ /sitemap.xml   Revalidate 1h
```
Корень `app/` у нас содержит только route-группы (`(frontend)`, `(payload)`) без корневого `layout.tsx` — metadata-route-файлам он и не нужен, они резолвятся в `/robots.txt` и `/sitemap.xml` независимо от групп.

## Рекомендация (для GOTCHAS)
- **Metadata-файлы Next App Router (`robots.ts`, `sitemap.ts`, `manifest.ts`, `favicon` и т.п.) держать в корне `app/`, не внутри route-group `(group)`.** sitemap может «повезти» в группе (поддержка вложенных sitemap-индексов), robots — нет; полагаться на это нельзя.
- Эвристика: «metadata-route не появился в route-таблице сборки, ошибок нет» → **первым делом проверь, не лежит ли файл в route-group**, перенеси в `app/`-корень.
- Переносимо на любой Next App Router проект с route-группами — **в т.ч. GONBA** (тот же стек; если у них robots/sitemap внутри `(frontend)` и работают — возможно, версия Next или структура иные; стоит проверить, что robots.txt реально отдаётся).

Связано: возможно, новая запись в `cross-project-ideas/GOTCHAS.md` (симптом: `robots.txt` 404 / нет в build-таблице при наличии файла).
