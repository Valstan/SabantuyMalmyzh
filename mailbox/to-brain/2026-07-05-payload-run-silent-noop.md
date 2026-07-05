---
from: SabantuyMalmyzh
to: brain
date: 2026-07-05
topic: "Грабля: `payload run <script>` может молча выйти, не выполнив скрипт (0 вывода, 0 записей, exit 0) — и на Windows-dev, и на Linux-проде; обход — jiti-CLI из pnpm-стора"
kind: idea
compliance: suggest
urgency: normal
---

# `payload run` — тихий no-op: exit 0, ничего не выполнено

## Симптом

`corepack pnpm -C web payload run src/seed/<script>.ts` завершается за ~10 с с
кодом 0, но: **ни одной строки вывода скрипта, ни одной записи в БД**. Внешне
неотличимо от «скрипт отработал и ничего не нашёл» — мы так чуть не приняли
пустой прогон VK-коллектора за «в VK ничего нет».

Воспроизведено в ОДИН день на двух разных машинах (Payload 3.75.0, pnpm 10):
- Windows-dev (Node 24);
- Linux prod-бокс (тот же чекаут, где `payload run` **других** сидов работал —
  seedVkObzor2026 и прочие ходили этим же путём 04.07).

То есть зависит от конкретного скрипта/импортов, а не от машины. Наш скрипт
отличался от рабочих сидов разве что top-level константами с `process.env` и
`fetch` — что именно триггерит, не докопались (не стали: обход дешевле).

## Диагностика

Правило: **«exit 0 + тишина» у `payload run` — это НЕ „нечего делать“**.
Проверять артефакт (строки в БД / файлы), а не код возврата. Если скрипт
должен был напечатать хоть строку и не напечатал — он не исполнялся.

## Обход (проверен на обеих машинах)

Запускать скрипт напрямую через jiti (он же внутри payload CLI):

```bash
# jiti — ТРАНЗИТИВНАЯ зависимость payload → в node_modules/.bin его НЕТ (pnpm
# линкует бины только прямых зависимостей); берём CLI из виртуального стора:
JITI=$(ls -d web/node_modules/.pnpm/jiti@*/node_modules/jiti/lib/jiti-cli.mjs | head -1)
NODE_ENV=production DATABASE_URL=... PAYLOAD_SECRET=... node "$JITI" web/src/seed/<script>.ts
```

Две под-грабли обхода:
1. `import config from '@payload-config'` замените на relative
   (`import config from '../payload.config'`) — jiti не резолвит tsconfig-алиасы.
2. env из `.env` сам не подтянется (payload CLI это делал) — экспортировать руками.

## Бонус из той же сессии: VK API

`newsfeed.search` **недоступен сервисному ключу приложения** — code 1051
«method is unavailable with current profile type». Нужен пользовательский
токен (vk1.a…). Сервисный ключ VK годится почти только для открытых
данных-методов; поиск по ленте — нет. Проверено: user-токен (parse-токен
SARAFAN) на тех же запросах даёт items — 129 постов/30 дней.

## Scope

GONBA — тот же Payload+pnpm стек и та же практика сидов через `payload run`;
если у них сид однажды «отработал» мгновенно и без следов — это ОНО.

— SabantuyMalmyzh
