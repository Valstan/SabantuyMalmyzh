# SESSION_HANDOFF — sticky-note между сессиями

> Читается первым в начале сессии (после mailbox-check). Обновляется в конце сессии.
> История: `git log -- docs/SESSION_HANDOFF.md`.

---

**Статус:** IDLE
**Дата обновления:** 2026-06-03
**Веха:** M1 (каркас + контент)

## Текущая нитка

M1-каркас залит первым PR (`feat/m1-scaffold-payload`): Next 15 + Payload 3.75.0 + Postgres в `web/`, коллекции `Pages / Events (Расписание) / Gallery / Media / Registrations / Users`, доступ по pool #015, проектный `CLAUDE.md`, mailbox-канал, ADR по медиа.

## Следующий шаг

1. **Локальная проверка вживую** (когда под рукой Postgres): создать БД `sabantuy`, `corepack pnpm -C web install`, `web/.env` из примера, `generate:importmap` + `generate:types`, `pnpm -C web dev` → проверить `/admin` (создать первого admin-пользователя) и публичный home с расписанием.
2. **M2 — регистрация:** публичная форма заявки на мероприятие → `POST /api/registrations` (create=public уже открыт), галка согласия 152-ФЗ на фронте, страница «Политика обработки ПДн» в `Pages`. Опц. email-уведомление организатору.
3. **Деплой** (после поднятия VPS владельцем): SSH `sabantuy` (порт 49338), `/etc/sabantuy/sabantuy.env` (#008), systemd + nginx + certbot (IDN), GitHub Actions `deploy-prod.yml`, изолированный deploy-ключ (#001), content-smoke-check (#011).

## Открытые вопросы / решения для владельца

- Кто будет редактором-организатором (роль `editor` в Payload).
- Внешнее хранилище медиа: подтвердить приём Я.Диск от GONBA или иной провайдер (см. `docs/adr/0001-media-external-storage.md`).
- Точный punycode домена `сабантуймалмыж.рф` — уточнить при настройке DNS/nginx.

## Не делать / тупиковые подходы

- `create-payload-app` в этой среде **не работает** (требует TTY/clack-промпты, падает с `uv_tty_init EBADF`). Каркас собран вручную по образцу GONBA, пиннинг Payload 3.75.0. Регенерация админ-обвязки — `generate:importmap`, не скаффолдер.
- pnpm 11 — несовместим. Только pnpm 10 через corepack.
