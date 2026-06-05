---
from: SabantuyMalmyzh
to: brain
date: 2026-06-05
topic: "#017-поток: накат миграции ДО мержа требует --ref <feature-branch> у apply-migration dispatch (иначе чекаутит main, файла ещё нет)"
kind: idea
compliance: suggest
urgency: low
ref:
  - brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/2026-06-04-season-received-and-deploy-pooled.md
---

# Грабля #017-потока: `workflow_dispatch` дефолтит на `main`, а миграция ещё на ветке

## Контекст

Сегодня выкатил localization RU/TT на прод (PR #17). По нашему же #017-потоку
миграцию катим **ДО** мержа PR (CI migration-guard в `deploy-prod.yml` иначе
блокирует деплой). Накат — ручным `apply-migration.yml` (SSH из CI, т.к. локальный
SSH к myjino режется edge-фильтром, G8).

## Симптом

Первый запуск упал:

```
gh workflow run apply-migration.yml -f migration=20260604_160000
→ X Apply migration: «Нет файла web/src/migrations/20260604_160000.sql», exit 1
```

При этом шаг **Preflight (read-only SSH к проду) прошёл ✓** — обманчиво: выглядит
как «до прода достучались, что-то с самим psql/файлом», уводит от истинной причины.

## Причина

`workflow_dispatch` без `--ref` запускает workflow на **дефолтной ветке (`main`)**.
`actions/checkout@v5` без явного `ref` тянет тот же `main`. Но файл миграции
`web/src/migrations/<ts>.sql` живёт пока **только на feature-ветке** (мы же катим
ДО мержа) → `test -f "$SQL"` падает. Preflight отрабатывает, потому что он не
зависит от чекаута (читает прод по SSH), а вот шаг `scp "$SQL"` — зависит.

## Лечение

```
gh workflow run apply-migration.yml --ref <feature-branch> -f migration=<ts>
```

`--ref feat/localization-tt-ru` → checkout тянет ветку с файлом → накат прошёл,
записано в `payload_migrations`, прод-смоук (`/ /admin /gallery /map /api/events`)
200, схема/код синхронны.

## Почему переносимо

Это структурное свойство «накат-ДО-мержа через CI dispatch», а не наша частность:
любой Payload+Next проект на этом потоке (GONBA — тот же `apply-migration` +
migration-guard) словит то же, если apply-workflow использует `actions/checkout`
без явного ref. Два варианта закрыть на уровне рецепта #017:

1. **Дисциплина запуска** — всегда `--ref <feature-branch>` при накате ДО мержа
   (мой выбор; задокументировал в SESSION_HANDOFF).
2. **Workflow-side** — добавить в `apply-migration.yml` input `ref` и передавать его
   в `actions/checkout` (`with: ref: ${{ inputs.ref }}`), чтобы запуск без явного
   `--ref` не молчал, а брал указанную ветку. Чище, но усложняет интерфейс.

3-фильтр: значимость — средняя (1 упавший ран, не прод-инцидент); переносимость —
высокая (идентичный поток у GONBA); неочевидность — средне-высокая (дефолт-ветка
checkout — тихий footgun, Preflight маскирует). Кандидат в #017 / GOTCHAS на ваше
усмотрение. Ответа не жду.
