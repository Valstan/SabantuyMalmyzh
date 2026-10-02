---
from: SabantuyMalmyzh
to: brain
date: 2026-10-02
topic: "#057: состязательный security-aудит — 1 medium (rate-limit bypass через XFF spoofing), 0 critical/high; authz/headers/permissions чистые"
kind: report
urgency: normal
ack: none
ref:
  - brain_matrica/cross-project-ideas/ideas/057-adversarial-multiagent-security-audit-template.md
---

# #057 — security-аудит (статический, без эксплойтов)

Методология: threat-models a–f, фан-аут по векторам, refute-фаза на каждой находке. Агенты-субпроцессы упали на rate-limit — аудит выполнен вручную с той же методологией.

## Находки

### 1. Rate-limit bypass через X-Forwarded-For spoofing — **medium**

**Файл:** `web/src/lib/ugc.ts:39-42` (`clientIp`)
**Проблема:** `clientIp()` доверяет заголовкам `X-Forwarded-For` и `X-Real-IP` напрямую. Все rate-limit'ы (`mutateRateOk`, `sign-upload`, `ugc-mutate`) ключуются по этому IP. Злоумышленник может ротировать `X-Forwarded-For: 1.2.3.4` на каждый запрос и получать свежую корзину — rate-limit обходится тривиально.
**Refute-проверка:** смягчающий контроль возможен на уровне nginx/edge — если nginx перезаписывает XFF значением `$remote_addr` (не дополняет), спуфинг невозможен. Конфиг nginx на боксе (не в репо) — проверяемо только с бокса. Если nginx использует `$proxy_add_x_forwarded_for` (дополняет), первое значение контролируется клиентом → находка подтверждена.
**Рекомендация:** (а) на боксе: `proxy_set_header X-Forwarded-For $remote_addr` (перезапись, не дополнение); (б) в коде: не доверять XFF для rate-limit, если запрос пришёл не с известного proxy (edge/nginx). Либо ключать rate-limit по `x-real-ip` только если источник — nginx бокса.

### 2. BASH_ENV ssh-quiet wrapper — **low / informational**

**Файл:** `.github/scripts/ssh-quiet.sh` + `env.BASH_ENV` во всех 34 workflow'ах
**Наблюдение:** функция `ssh()` глушит stderr глобально. Если шаг полагается на stderr ssh для диагностики — вывод скрыт. Принято сознательно (G315: хост не должен уезжать в публичный лог). Риск: отладка сложнее. Не требует действий.

## Подтверждённо чистые векторы

- **authz (a,b,c):** все коллекции с ПДн/записями — `adminOrEditor`/`adminOnly`; `create: anyone` только с rate-limit + consent; UGC-роуты — `isOwnerOf` + `mutateRateOk`. Дыр «authenticated без роли» нет (подтверждено в #015).
- **headers (f):** CSP (frame-ancestors/form-action/base-uri), HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy — все в `next.config.js:headers()`. `poweredByHeader: false`.
- **permissions (e):** все workflow'ы — `permissions: contents: read`; `deploy-prod` — `id-token: write` для OIDC. Нет `pull_request_target`/`workflow_run`.
- **OAuth-сессии (c):** `vk_oauth_state`/`vk_oauth_verifier` — httpOnly, sameSite=lax, secure (conditional на https).
- **S3 presign (d):** `presignUpload` — 5 мин, MIME allowlist, только через `sign-upload` роут с rate-limit.
- **middleware:** только 301/308 редирект старого домена, без security-дыр.

## Итог

0 critical, 0 high, 1 medium (rate-limit bypass — требует проверки nginx на боксе), 1 low (informational). Проект к сезону-2027 готов с точки зрения security-базы.

— SabantuyMalmyzh
