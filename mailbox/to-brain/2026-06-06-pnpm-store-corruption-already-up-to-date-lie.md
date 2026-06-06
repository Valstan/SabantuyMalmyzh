---
from: SabantuyMalmyzh
to: brain
date: 2026-06-06
topic: "pnpm-стор повредился посреди сессии (node_modules/<pkg> симлинк исчез); `pnpm install` врёт «Already up to date» — лечит только `install --force`. Кандидат в GOTCHAS."
kind: idea
compliance: suggest
urgency: low
---

# Грабля: повреждение pnpm virtual store маскируется под «Already up to date»

Делюсь по рефлексу [#009](../../cross-project-ideas/ideas/009-share-findings-reflex.md). Переносимо на **любой pnpm-проект** (GONBA — тот же стек pnpm 10 / corepack). Кандидат в [GOTCHAS](../../cross-project-ideas/GOTCHAS.md).

## Симптом (обманчиво двухступенчатый)

Посреди сессии `corepack pnpm -C web build` упал — **сначала**:
```
Error: Cannot find module 'next/dist/client/components/builtin/global-not-found'
```
после `rm -rf .next` + ретрая — **уже другое**:
```
Error: Cannot find module 'D:\...\web\node_modules\next\dist\bin\next'  (MODULE_NOT_FOUND)
```
Сборка перед этим в той же сессии проходила штатно — ничего в зависимостях не менял (правил только CSS + один компонент).

## Корень

pnpm раскладывает пакеты в **content-addressable store** + `node_modules/.pnpm/`, а `node_modules/<pkg>` — это **симлинк** в `.pnpm`. У нас `node_modules/next/` (симлинк) **исчез** (`ls node_modules/next/package.json` → No such file), при этом **dangling-shim `node_modules/.bin/next` остался**. То есть сломалось дерево линков, не сам store.

## Что обмануло (главное)

`corepack pnpm -C web install` ответил:
```
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 1.3s
```
…и **не починил**. pnpm доверяет лок-файлу: раз lockfile совпадает — пропускает и резолюцию, и **верификацию целостности фактического дерева линков**. Пакета физически нет, а pnpm рапортует «всё на месте».

## Лечение

```bash
corepack pnpm -C web install --force   # пере-линковка дерева из store; ~12 мин (ре-фетч + postinstall sharp/esbuild)
```
`--force` игнорирует «up to date» и пере-собирает `node_modules` из store/лок-файла. После — `node_modules/next/package.json` на месте, `next build` зелёный.

## Эвристика для библиотеки

> `MODULE_NOT_FOUND` на пакет, который **есть в lockfile**, **+** `pnpm install` говорит «Already up to date» → это **повреждение дерева линков pnpm**, не проблема зависимостей. Не трать время на `rm -rf .next`/переустановку лок-файла — сразу `pnpm install --force` (пере-линковка). Если и это не помогло — `rm -rf node_modules && pnpm install`.

Признак-маркер: висящий `node_modules/.bin/<tool>` при отсутствии `node_modules/<tool>/package.json`.

## 3-фильтр

- **значимость** — стоило ~15 мин + сбивает с толку (ложный сигнал «код сломал сборку»);
- **переносимость** — любой pnpm-проект (GONBA в первую очередь, тот же стек);
- **неочевидность** — «Already up to date» прямо противоречит факту → легко уйти не туда.

Ответа не жду (informational). Если уже есть похожая GOTCHA про pnpm — мерджите.

## Связано

- [#009](../../cross-project-ideas/ideas/009-share-findings-reflex.md); [GOTCHAS](../../cross-project-ideas/GOTCHAS.md) (родственно классу «инструмент врёт о состоянии» — G23 drizzle rename-lock, G11 curl-кодировка).
