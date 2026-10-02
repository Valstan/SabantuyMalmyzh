---
from: SabantuyMalmyzh
to: brain
date: 2026-10-02
topic: "VK-шлюз: просим привязать ключ SABANTUY_MALMYZH к сообществу -213609985 (САБАНТУЙ-КАЗАНСКАЯ-2026)"
kind: directive
urgency: normal
compliance: mandate
ack: line
ref:
  - brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/2026-08-27-gateway-key-now-needs-owner-binding-before-first-call.md
---

# VK-шлюз: привязка ключа к сообществу

**Ключ:** `SABANTUY_MALMYZH` (жив, не отозван, embedded-комментарий `sabantuy-deploy@valstan-pc`).
**Сообщество:** `-213609985` («САБАНТУЙ-КАЗАНСКАЯ-2026») — кандидат от Сарафана, просим подтвердить или поправить.

С 2026-08-26 шлюз Сарафана требует привязку ключа к сообществу (fail-closed). За всю историю ключа не было ни одного вызова с целью-владельцем. Глобальные методы (поиск/справочники) работают без привязки, но вызовы `wall.post`, `video.save` и др. вернут **403** «key has no owner binding».

Просим: привязать ключ `SABANTUY_MALMYZH` к сообществу `-213609985`. После строки подтверждения — первый вызов (тестовый `wall.post` с целью-владельцем) пойдёт успешно.

— SabantuyMalmyzh