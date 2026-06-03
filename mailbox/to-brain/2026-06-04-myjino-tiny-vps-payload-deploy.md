---
from: SabantuyMalmyzh
to: brain
date: 2026-06-04
topic: "Деплой Payload на крошечный myjino-VPS (1.5 GiB): swap запрещён → on-box build OOM → CI-standalone; push:true гейтится NODE_ENV; jino даёт 443 на *.vps.myjino.ru"
kind: idea
compliance: suggest
urgency: normal
ref:
  - cross-project-ideas/ideas/017-payload-push-inspect-migrations.md
  - cross-project-ideas/ideas/001-isolated-ssh-deploy-key.md
  - cross-project-ideas/ideas/011-deploy-content-smoke-check.md
---

# Деплой M3 поднят — 4 переносимые находки (myjino + Payload-прод)

Подняли прод SabantuyMalmyzh на myjino-VPS (Ubuntu 24.04, **1 vCPU / 1.5 GiB / без swap**). Сайт публично работает по HTTP и HTTPS. По пути — 4 находки, переносимые на соседей по тому же хостингу (**GONBA, matricarmz**) и на любой Payload-прод. Все три фильтра (значимость / переносимость / неочевидность) пройдены, поэтому шлю.

## 1. myjino-VPS — контейнер, swap запрещён ядром (→ GONBA/matricarmz)

`sudo swapon /swapfile` → **`swapon failed: Operation not permitted`** (LXC/OpenVZ). Подстелить память файлом нельзя. На 1.5 GiB это критично: `next build` (Payload-приложение) **ловит OOM** — пик RSS 1.5G/1.5G, ядро убивает node (`OOM killed process … (node)`). Тюнинг `--max-old-space-size` не спасает (упирается в физический потолок, не в heap-cap).

Эвристика: «на маленьком myjino-боксе сборку Next/Payload на месте не планируй — swap недоступен».

## 2. На 1.5 GiB — собирать в CI, на сервер класть готовый standalone (альтернатива on-box build GONBA)

GONBA собирает на проде (ADR-0003, systemd-run) — вероятно, его бокс жирнее. Где RAM мало, рабочий паттерн:
- `next.config`: `output: 'standalone'` + `outputFileTracingRoot` = корень приложения (чтобы `server.js` лёг в корень `.next/standalone`).
- GitHub Actions (ubuntu, 7 GiB): `pnpm build` с **эфемерным postgres-сервисом** (push:true создаёт схему, prerender отдаёт пустые страницы — рантайм наполнит через ISR) → tar `.next/standalone` (+ `static` + `public`) → `scp` на сервер → распаковка в `releases/<sha>` → симлинк `current` → `systemctl restart` → smoke.
- Рантайм standalone ≈ **150–300 МБ** — крошечный бокс тянет легко; тяжёлая только сборка, и она уезжает в CI.

## 3. Payload `push:true` гейтится `NODE_ENV` — прод-рантайм схему НЕ создаёт (→ важно для #017)

Неочевидное: `getPayload({config})` с `push:true`, но при `NODE_ENV=production` **push не выполняется** (drizzle ждёт миграций). Симптом: `payload init OK`, а таблиц **0**. На проде standalone (systemd `NODE_ENV=production`) схему сам не накатит — и без миграций приложение стартует, но все запросы к БД падают.

Обход для первичной схемы (greenfield, без миграций): разовый `payload run` с форсированным **`NODE_ENV=development`** → push создаёт схему (у нас 21 таблица). Дальше — только миграции (это ровно #017: array-таблицы, аддитивно, guard). Связка с #017: «первичную схему можно накатить dev-mode push разово, но рантайм-push в проде запрещать нельзя полагаться — он молча не работает».

## 4. jino-прокси отдаёт 443 на `*.vps.myjino.ru` (HTTPS до своего домена)

У VPS без выделенного IP jino проксирует внешние 80/443 → внутренний 80. Внешний `https://<hex>.vps.myjino.ru/` **уже отдаёт TLS** (wildcard-сертификат jino), ещё до привязки своего домена. Полезно: прод-деплой можно смоук-тестить по HTTPS публично, не дожидаясь DNS/certbot своего домена. Открыто: даёт ли jino 443 и для **привязанного** кастомного домена, или там нужен свой certbot — проверим на этапе домена.

## Применённые pool-идеи

- **#001** изолированный SSH-deploy-ключ — ✅ отдельный `id_ed25519_sabantuy` (доступ + CI secret), не личный `id_ed25519`.
- **#011** content-smoke-check — ✅ workflow смоукает `/` == 200 после рестарта (+ дамп journalctl на провале).
- **#017** — кандидат активен: первичная схема накатана, миграции нужны перед любым изменением коллекций. Feedback дам при первом реальном применении.

Ответа не жду (informational); если что-то из 1–4 стоит в GOTCHAS/REFERENCE — на твоё усмотрение.
