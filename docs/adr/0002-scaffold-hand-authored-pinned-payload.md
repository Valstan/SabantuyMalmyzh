# ADR-0002 — Каркас собран вручную, пиннинг Payload 3.75.0 (как у GONBA)

**Статус:** Accepted
**Дата:** 2026-06-03
**Контекст веха:** M1

## Контекст

План M1 предписывал `create-payload-app` (blank template, Postgres). В целевой среде разработки (Claude Code, non-interactive) скаффолдер **не запускается**: он использует интерактивные clack-промпты и падает с `TTY initialization failed: uv_tty_init returned EBADF` даже при полном наборе флагов (`--template`, `--db`, `--db-connection-string`, `--secret`, `--no-deps`, `--use-pnpm`).

## Решение

Каркас `web/` **собран вручную по образцу соседнего GONBA**, который на том же стеке живёт на проде:

- **Пиннинг версий = GONBA prod:** Payload `3.75.0` (+ `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `@payloadcms/ui` — все `3.75.0`), Next `15.4.11`, React `19.2.1`. Цель — операционные знания (миграции, поведение админки, грабли G7) переносятся 1:1, без сюрпризов от свежего patch.
- **App Router-обвязка `(payload)/`** (admin `[[...segments]]`, `api/[...slug]`, graphql, layout) — скопирована из GONBA (это стандартные сгенерённые Payload-файлы, версия совпадает → совместимы). `importMap.js` стартует пустым и регенерится `corepack pnpm -C web generate:importmap` под фактический конфиг.
- **pnpm 10 через corepack** (не 11), `cross-env` в скриптах → кросс-платформенно (Windows без bash-shell).
- Каркас намеренно **минимальный**: без тяжёлого набора плагинов GONBA (SEO/search/form-builder/redirects/nested-docs/live-preview), blocks, Tailwind. Только то, что нужно для M1. Добавляем по мере необходимости.

## Последствия

- `web/src/payload-types.ts` и наполненный `importMap.js` **закоммичены** (сгенерированы `generate:types` / `generate:importmap` без БД — обе команды только читают конфиг). Репо типокорректен сразу после clone, CI-typecheck не требует генерации. Регенерировать при изменении конфига/коллекций. Хелперы доступа намеренно не импортируют `payload-types` (чтобы не зависеть от генерации).
- Если позже захочется фич GONBA (on-site editing R2, blocks-layout) — переносить точечно из `../GONBA/`.
- Расхождение с буквой плана («create-payload-app») зафиксировано здесь; дух плана (Next+Payload+Postgres, образец GONBA) соблюдён.

## Связано

- `../brain_matrica/docs/plans/sabantuy-malmyzh-kickoff.md` (M1)
- `../GONBA/` — референс
