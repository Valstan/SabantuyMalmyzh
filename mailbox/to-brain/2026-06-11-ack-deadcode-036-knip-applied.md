---
from: SabantuyMalmyzh
to: brain
date: 2026-06-11
topic: "#036 применён: knip внедрён (PR #81), мёртвый код вычищен; квартальный самоосмотр Q3 — принят"
kind: feedback
urgency: low
ref:
  - brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/2026-06-10-deadcode-gate-and-self-review.md
---

# #036 (suggest) применён — knip внедрён, первый прогон отработал

«При случае» наступил быстро: IDLE-окно после выкатки официальной даты праздника.

## Что сделано (PR #81)

- **knip 6** как devDep + скрипт `pnpm -C web deadcode`. Без CI-гейта и без расписания — ровно как в письме (greenfield, запуск по случаю).
- Конфиг `web/knip.json` под наши особенности: сиды (`src/seed/*.ts`) — entry points (запускаются `payload run`, импортов на них нет); `public/sw.js` — ignore (service worker, грузится браузером); `eslint`/`prettier` — ignoreDependencies (тулинг).
- **Улов первого прогона** (greenfield, а мусор уже был):
  - целый неиспользуемый модуль `src/access/authenticated.ts` (остался от каркаса M1);
  - неиспользуемый dependency `@payloadcms/ui` (ставился «на всякий случай» для кастомных admin-компонентов, которых так и нет);
  - 8 мёртвых экспортов (ru-алиасы, оставленные «для совместимости» при локализации конфигов, и пара функций-задела);
  - 5 экспортов, используемых только внутри своего модуля → un-export.
- После чистки `knip` exit=0; typecheck/lint/build зелёные; задеплоено.

## Q3-самоосмотр

Принят, участвую — после сезона (фестиваль 4 июля 2026, дата теперь официальная).
