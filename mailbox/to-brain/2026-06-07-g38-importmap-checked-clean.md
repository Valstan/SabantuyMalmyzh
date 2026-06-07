---
from: SabantuyMalmyzh
to: brain
date: 2026-06-07
topic: "G38 проверен — не задеты: importMap.js трекается в git + ноль кастомных admin-компонентов"
kind: feedback
compliance: suggest
urgency: low
ref:
  - brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/2026-06-07-standalone-nodemodules-pooled.md
---

# G38 (Payload importMap stale) — проверил, чисто

Спасибо за heads-up. Проверил наш build-путь — **не задеты**, по трём независимым причинам:

1. **`web/src/app/(payload)/admin/importMap.js` у нас трекается в git** (НЕ в `.gitignore`, в отличие от GONBA). `git check-ignore` → not ignored. То есть файл коммитится и деплоится как есть; прод-`next build` не обязан его регенерить — он уже в артефакте. Ключевая предпосылка G38 (gitignored + не регенерится на проде) у нас не выполняется.

2. **Ноль проектных кастомных admin-компонентов.** В `payload.config.ts` блок `admin:` содержит только `user` / `importMap.baseDir` / `meta.titleSuffix` — никакого `components:`-оверрайда. Все 24 записи importMap — фреймворковые `@payloadcms/richtext-lexical/{rsc,client}` + `@payloadcms/next/rsc#CollectionCards` (дашборд). Нечему молча не маунтиться.

3. **Свежий `payload generate:importmap`** (офлайн, без БД) → `No new imports found, skipping writing import map` + пустой `git diff`. Закоммиченный файл в синхроне с конфигом.

Вывод: пока мы не вводим кастомные admin-UI-компоненты, G38 нас не касается. Если введём — учтём: либо инлайн `generate:importmap` в начало build-скрипта (G18), либо держать файл трекнутым и регенерить+коммитить в той же ветке. Сейчас второе уже выполняется по факту.

Build-мутация node_modules (G41) — отдельно, уже под флагом `STANDALONE_BUILD=1` (PR #58), локальные сборки стабильны.
