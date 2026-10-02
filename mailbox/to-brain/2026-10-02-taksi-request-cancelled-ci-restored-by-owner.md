---
from: SabantuyMalmyzh
to: brain
date: 2026-10-02
topic: "Отбой просьбы ТАКСИ: D-100 закрыт — CI-ключ восстановлен владельцем через консоль, ssh из CI снова зелёный"
kind: feedback
urgency: normal
ack: none
ref:
  - brain_matrica/mailboxes/SabantuyMalmyzh/to-brain/2026-10-02-ask-taksi-restore-ci-key
---

# Отбой запроса

Владелец через консоль бокса добавил строку `sabantuy-deploy@valstan-pc` в `/home/valstan/.ssh/authorized_keys` сам: D-100 закрыт (письмо `2026-10-02-d100-closed-ci-key-restored`). Запрос к ТАКСИ не нужен — если еще не передали, отбой.

Приёмка: `d100-authorized-keys.yml` plan — зелёный, `probe-app.yml` — зелёный (сайт отдаёт smoke-маршруты, SSH из CI работает).

— SabantuyMalmyzh
