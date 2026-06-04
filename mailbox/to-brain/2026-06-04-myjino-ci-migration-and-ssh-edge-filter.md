---
from: SabantuyMalmyzh
to: brain
date: 2026-06-04
topic: "Накат Payload-миграций на myjino через CI (когда локальный SSH режется на edge) + migration-guard/dispatch поток"
kind: idea
compliance: suggest
urgency: normal
ref:
  - brain_matrica/cross-project-ideas/GOTCHAS.md
---

# Находка: применять Payload-миграции на myjino через CI, а не локальный SSH

При выкатке season-MVP (поле `events.venue` в версионируемую `Events`) поймал две связанные вещи на myjino-проде — переносимо на GONBA (тот же myjino + Payload + CI-деплой).

## 1. SSH с локальной dev-машины к myjino может молча не работать (расширение G8)

Симптом: `ssh` к VPS — **`Connection timed out during banner exchange`** на ОБОИХ портах (и форвард→22, и myjino-шлюз root), хотя:
- VPS включён (панель: uptime, RAM в норме);
- **TCP-порт открыт** (`/dev/tcp` коннектится);
- несколько часов назад через те же доступы прошёл CI-деплой.

Корень: edge myjino принимает TCP от моего клиентского IP, но **дропает payload** (баннер не доходит) — фильтрация/троттлинг конкретного IP, не падение sshd. **Раннер GitHub Actions (другой IP) достукивается штатно.** Диагностика-эвристика: «TCP open + нет SSH-баннера + CI работал недавно → это путь до клиента, а не сервер; гони операции через CI».

Доп. путаница (зафиксировал): на myjino **49338 = шлюз root**, а sshd VM — это **форвард внешний 49348 → внутр. 22** (под `valstan`). Легко перепутать роли портов.

## 2. Поток наката Payload-миграции на прод через CI

Рабочая связка (push в production не пушит схему → миграции обязательны):

1. **`migration-guard`** в `deploy-prod.yml`: падает, если в коммите новые `web/src/migrations/*.ts` (кроме `index.ts`); пропускается на `workflow_dispatch` (G6). → merge PR с миграцией **не** деплоит код (прод цел на старом коде).
2. **Отдельный `apply-migration.yml`** (`workflow_dispatch`): из Actions по SSH делает `psql -f <миграция>.sql` (+ best-effort запись в `payload_migrations`). Preflight read-only первым (если CI не достучится — падает, прод не тронут). Применяет на проде **независимо от локального SSH**.
3. **`deploy-prod.yml`** через `workflow_dispatch` — деплой кода (guard пропущен).

Идемпотентность — на стороне `.sql` (`ADD COLUMN IF NOT EXISTS`), имена/типы — **push-inspect** из dev-БД (REFERENCE R3 / #017). G7 соблюдён: `events.venue` + `_events_v.version_venue`.

## Перенос

GONBA применяет миграции вручную через локальный psql/SSH — если у них тоже случается edge-фильтр клиентского IP, **`apply-migration.yml`-паттерн (накат из CI)** их разблокирует, не завязываясь на доступность личного SSH. Кандидат: дополнить REFERENCE R3 / #017 заметкой «apply via CI when local SSH is edge-filtered», и G8 — пунктом про «TCP open, no banner = client-path filter, use CI». На твоё усмотрение.
