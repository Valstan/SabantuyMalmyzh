# SESSION_HANDOFF — sticky-note между сессиями

> Читается первым в начале сессии (после mailbox-check). Обновляется в конце сессии.
> История: `git log -- docs/SESSION_HANDOFF.md`.

---

**Статус:** IDLE
**Дата обновления:** 2026-06-03
**Веха:** M1 (каркас + контент) — ✅ каркас смержён в `main`

## Сделано (PR #1, смержён в main)

M1-каркас: Next 15 + Payload 3.75.0 + Postgres в `web/`, коллекции `Pages / Events (Расписание) / Gallery / Media / Registrations / Users`, доступ по pool #015, проектный `CLAUDE.md` + `/start`, mailbox-канал (письмо-отчёт brain'у отправлено), ADR-0001 (медиа) / ADR-0002 (каркас). Проверено зелёным: install, generate:importmap/types, typecheck, `next build`.

## ⚠️ Начало завтрашней сессии (другой компьютер!)

Машина свежая — node_modules и локальной БД на ней нет. По порядку:

```bash
# 0) /start: mailbox-check brain + этот файл
# 1) подтянуть main
git pull --ff-only
# 2) pnpm 10 и зависимости
corepack prepare pnpm@10.15.0 --activate
corepack pnpm -C web install
# 3) локальный Postgres: создать БД `sabantuy`, затем:
cp web/.env.example web/.env        # вписать DATABASE_URL + PAYLOAD_SECRET
corepack pnpm -C web generate:importmap
corepack pnpm -C web generate:types
corepack pnpm -C web dev            # http://localhost:3000 · /admin
```

## Следующий шаг (по приоритету)

1. **Live-проверка M1:** поднять `dev`, на `/admin` создать первого admin-пользователя (роль admin), завести 1-2 тестовых события → убедиться, что home показывает расписание. Это закрывает M1 «расписание видно».
2. **M2 — регистрация:** публичная форма заявки → `POST /api/registrations` (create=public уже открыт), галка согласия 152-ФЗ на фронте, страница «Политика обработки ПДн» в `Pages`. Опц. email-уведомление организатору.
3. **Деплой** (после поднятия VPS владельцем): SSH `sabantuy` (порт 49338), `/etc/sabantuy/sabantuy.env` (#008), systemd + nginx + certbot (IDN), GitHub Actions `deploy-prod.yml`, изолированный deploy-ключ (#001), content-smoke-check (#011).

## Открытые вопросы / решения для владельца

- Кто будет редактором-организатором (роль `editor` в Payload).
- Внешнее хранилище медиа: подтвердить приём Я.Диск от GONBA или иной провайдер (`docs/adr/0001-media-external-storage.md`).
- Точный punycode домена `сабантуймалмыж.рф` — уточнить при настройке DNS/nginx.

## Не делать / тупиковые подходы

- `create-payload-app` в среде Claude Code **не работает** (требует TTY/clack, `uv_tty_init EBADF`). Каркас собран вручную по образцу GONBA, пиннинг Payload 3.75.0. Регенерация админ-обвязки — `generate:importmap`, не скаффолдер. (См. ADR-0002.)
- pnpm 11 — несовместим. Только pnpm 10 через corepack.
