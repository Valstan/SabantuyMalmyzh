---
from: SabantuyMalmyzh
to: brain
date: 2026-06-07
topic: "Next.js output:'standalone' build МУТИРУЕТ локальный node_modules (удаляет next builtin) → следующая локальная сборка/typecheck/lint падает Cannot find module. Маскируется под антивирус. GONBA/KARMAN на том же стеке задеты."
kind: idea
compliance: recommend
urgency: normal
---

# Грабля: `next build` с `output:'standalone'` ломает свой же node_modules для следующей локальной сборки

Делюсь по [#009](../../cross-project-ideas/ideas/009-share-findings-reflex.md). **Переносимо на любой Next standalone-проект; GONBA и KARMAN на том же стеке (Next + standalone-деплой) почти наверняка задеты.** Compliance=recommend. Кандидат в [GOTCHAS](../../cross-project-ideas/GOTCHAS.md).

## Симптом (очень обманчивый)

Локально `next build` / `typecheck` / `lint` начали падать «на ровном месте»:
```
Error: Cannot find module 'next/dist/client/components/builtin/global-not-found'
Error: Cannot find module '.../node_modules/next/dist/bin/next'
Error: Cannot find module '.../node_modules/typescript/bin/tsc'
```
Каждый раз — РАЗНЫЙ отсутствующий файл. `pnpm install` помогал на одну сборку, потом снова падало. Сначала **ошибочно списали на Windows Defender** (квартин SWC-бинарей) — потратили время на exclusion-советы. **Антивируса на машине вообще нет** (`Get-CimInstance SecurityCenter2` пуст, службы `WinDefend` нет).

## Корень

Воспроизведение в чистоте: `rm -rf node_modules && pnpm install` → **BUILD 1 ✓** → **BUILD 2 (тот же node_modules, секунды спустя) ✗** `global-not-found`.

`next build` с **`output: 'standalone'`** делает `outputFileTracing` и в процессе **УДАЛЯЕТ файлы из `node_modules/next/dist/client/components/builtin/`** (и др.). Следующий инструмент, читающий node_modules (вторая сборка, tsc, eslint), падает. **CI не страдает** — там свежий `install` на КАЖДУЮ сборку и ровно одна сборка за прогон; баг видно только при повторных локальных сборках.

Диагностический маркер: после успешной `next build` каталог `node_modules/.pnpm/next@*/node_modules/next/dist/client/components/builtin/` пуст/отсутствует, хотя глобальный pnpm-стор цел.

## Лечение

Гейтить standalone за env-флагом — локально обычная сборка (node_modules не портит), в CI флаг включает standalone:
```js
// next.config.js
output: process.env.STANDALONE_BUILD === '1' ? 'standalone' : undefined,
```
```yaml
# deploy workflow, build-шаг:
env:
  STANDALONE_BUILD: '1'
```
Проверено: локально `build → build → typecheck` подряд зелёные без реинстолла; CI-деплой со standalone тоже зелёный (server.js собирается). Если флаг забыт в CI → шаг сборки standalone-артефакта падает громко (server.js нет) — fail-loud, не silent.

## Эвристика

> Повторные локальные сборки/`typecheck`/`lint` падают `Cannot find module` (каждый раз разный файл), `pnpm install` чинит на один раз — это **НЕ антивирус**. Проверь: после `next build` пуст ли `node_modules/.../next/dist/client/components/builtin/`. Если да — виноват `output:'standalone'` (мутирует node_modules). Гейтить standalone флагом; для локальной верификации standalone не нужен.

## 3-фильтр

- **значимость** — стоило ~часов, увело в ложный диагноз «антивирус»;
- **переносимость** — любой Next standalone-проект; GONBA/KARMAN прямо;
- **неочевидность** — build портит СВОЙ ЖЕ node_modules; маскируется под AV/«среда сломана».

## Связано

- [#009](../../cross-project-ideas/ideas/009-share-findings-reflex.md); родственно письму 2026-06-06 про pnpm-стор (тоже «среда врёт о состоянии node_modules», но другой корень — там пропажа линков, тут мутация билдом).
