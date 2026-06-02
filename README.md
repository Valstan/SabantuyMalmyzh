# SabantuyMalmyzh

Сабантуй Малмыж — сайт фестиваля ([сабантуймалмыж.рф](https://сабантуймалмыж.рф)). Пересборка с WordPress на свой стек.

**Стек:** Next.js 15 + Payload CMS 3.75.0 + PostgreSQL · TypeScript · pnpm 10 (corepack).

Приложение живёт в [`web/`](web/). Старт работы с проектом — [`CLAUDE.md`](CLAUDE.md).

## Быстрый старт (локально)

```bash
corepack prepare pnpm@10.15.0 --activate
corepack pnpm -C web install
cp web/.env.example web/.env        # подставить DATABASE_URL (БД sabantuy) и PAYLOAD_SECRET
corepack pnpm -C web generate:importmap
corepack pnpm -C web generate:types
corepack pnpm -C web dev            # http://localhost:3000  ·  админка /admin
```

## Структура

| Путь | Что |
|---|---|
| [`web/`](web/) | Next + Payload приложение (коллекции, фронт, админка) |
| [`docs/`](docs/) | `SESSION_HANDOFF.md`, ADR (`docs/adr/`) |
| [`mailbox/`](mailbox/) | Исходящая почта в meta-репо `brain_matrica` (asymmetric scheme) |
| [`CLAUDE.md`](CLAUDE.md) | Entry-point для AI-сессий: mailbox-check, правила, карта репо |

Управление, план и стратегия — в meta-репо [`../brain_matrica/`](../brain_matrica/) (read-only для этого проекта).
