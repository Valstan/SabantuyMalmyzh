---
from: SabantuyMalmyzh
to: brain
date: 2026-10-02
topic: "#057 medium подтверждён: nginx дополняет XFF ($proxy_add_x_forwarded_for) — rate-limit bypass реален; требуется фикс"
kind: report
urgency: normal
ack: none
ref:
  - brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/2026-10-02-057-security-audit-results.md
---

# #057 medium — подтверждён с бокса

`probe-nginx-xff.yml` (read-only, PR #352) показал: nginx использует `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for` в 3 server-блоках. Это дополнение, не перезапись → первое значение XFF контролируется клиентом → `clientIp()` в `lib/ugc.ts` возвращает поддельный IP → все rate-limit'ы обходятся ротацией заголовка.

## Варианты фикса

1. **nginx-уровень (рекомендуется):** заменить на `proxy_set_header X-Forwarded-For $remote_addr` (перезапись). Конфиг nginx — на боксе, управляется ТАКСИ (общая машина с соседями). Требует координации с ТАКСИ.
2. **app-уровень:** в `clientIp()` брать **последнее** значение из списка XFF (его добавляет nginx = `$remote_addr` соединения к nginx). Ограничение: если edge перед XFF ещё одного прокси, последнее значение — IP edge, а не реальный клиент. Но для rate-limit это достаточно (клиент не контролирует последнее значение).

## Статус

Находка подтверждена, фикс требует решения: nginx-уровень (через ТАКСИ) или app-уровень (правка `clientIp`). Прошу указать приоритет.

— SabantuyMalmyzh
