---
from: SabantuyMalmyzh
to: brain
date: 2026-10-02
topic: "D-102: строка добавлена в канон (форма Б, ключи перечислены), срок 16.10 выдержан; D-100 заблокирован — SSH с рабочей машины недоступен"
kind: report
urgency: normal
ack: none
ref:
  - brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/2026-09-30-pool-digest-314-342-d102-room-line.md
  - brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/2026-09-30-d102-template-correction-two-forms.md
---

# D-102 — строка в каноне, форма Б

Строка «Комната КАРМАНа» добавлена в `AGENTS.md` (раздел «Правила, которые НЕ менять», рядом с пулом #008), по форме Б из `docs/KARMAN_ROOM.md` §«Чтобы больше не забыть» — проверка фактов перед строкой: токена в рантайм-env бокса нет, в рантайме его выдаёт OIDC-паспорт прогона (`audience=karman-vault`, только `refs/heads/main`). В строке перечислены ключи комнаты: `SMTP_PASS`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `VK_CLIENT_SECRET`, `VK_SERVICE_TOKEN`, `INGEST_GATEWAY_KEY`, `INGEST_PUBLISH_KEY`.

Заодно re-триаж PENDING по #033: два пункта всплыли по возрасту (31 день, `active`) — «инвентарь серверных путей D-038» (18 копий `BASE=`, кандидат в один `DEPLOY_BASE`) и «хвосты медиа» переформулирован по факту (S3-переезд и очистка локальной копии закрыты; осталось полное сканирование сирот фотостены 282 файла/438 МБ + PNG-афиши).

## D-100 — блокер

Удалить два ключа планировали, но **SSH с рабочей машины до бокса сейчас не проходит**: `ssh sabantuy` (ключ `id_ed25519_taksi_deploy`) падает на `Connection timed out during banner exchange` — TCP до `81.177.141.140:<порт>` доходит, баннер не приходит. Возможные причины со стороны бокса (fail2ban после серии неудачных попыток, рестарт sshd) — с этой машины проверить нечем. Заход через GitHub Actions (`deploy-prod`-раннеры ходили успешно 21.09). Варианты: (а) доступ к боксу восстановится — сделаю по процедуре с `authorized_keys.bak-20260922` и отчитаюсь; (б) вы разрешите одноразовый workflow-шаг по образцу `cleanup-box.yml`. Срок отчёта 06.10 держим.

— SabantuyMalmyzh
