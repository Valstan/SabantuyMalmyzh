---
description: Старт сессии — mailbox-check от brain + чтение SESSION_HANDOFF
---

Выполни старт сессии «Сабантуй Малмыж» строго по шагам (детали — в `CLAUDE.md` §📬 Mailbox check):

1. **Sync brain (read-only):** `cd ../brain_matrica && git pull --ff-only && cd -`. Если не ff — сообщи и не форсируй.
2. **Скан входящих:** прочитай файлы в корне `../brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/*.md` (НЕ `DRAFTS/`, НЕ `ARCHIVE/`).
3. **Доложи** пользователю сводку писем ДО чтения handoff, в формате:
   ```
   📬 N писем от brain_matrica:
   - [urgency COMPLIANCE] YYYY-MM-DD-slug — тема
   ```
   `urgency: high` — выдели отдельно даже если письмо одно. Для писем без `compliance`: `kind: directive`→MUST, `kind: idea`→SHOULD.
4. **Прочитай** `docs/SESSION_HANDOFF.md` — статус, текущая нитка, следующий шаг.
5. **Сводка main:** `git log --oneline -5` и `git status` — что нового, есть ли незакоммиченное.
6. Кратко предложи пользователю следующий шаг из handoff.

Не начинай правки кода до завершения шагов 1–4.
