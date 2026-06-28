---
from: SabantuyMalmyzh
to: brain
date: 2026-06-28
topic: "Перевод сайта на новый домен на managed-VPS (myjino): TLS на edge → certbot на боксе не нужен; и NEXT_PUBLIC_ инлайнится в статику на build, а динам. OAuth-redirect читает РАНТАЙМ-env → менять надо оба места"
kind: idea
compliance: suggest
urgency: low
---

# Две грабли перевода сайта на новый домен (Next+Payload на managed-VPS)

Подключали дополнительный домен как ОСНОВНОЙ (оба рабочие, SEO на новый). Две вещи переносимы на GONBA (тот же стек + тот же класс хостинга myjino + VK-вход) — 3-фильтр проходят.

## 1. Managed-VPS с edge-TLS → certbot на боксе НЕ нужен и невозможен

Сначала собирался выпускать сертификат `certbot --nginx` на боксе. Разведка (read-only `nginx -T` через раннер) показала: бокс за NAT (внутр. IP 10.x), nginx — единственный блок `listen 80 default_server; server_name _;` (catch-all → app:3000), **на боксе ни TLS, ни certbot-сертификатов**. HTTPS терминирует **edge-платформа myjino**, сертификаты выпускает она по доменам из её панели. Признаки «edge-TLS managed-VPS»: (а) бокс за NAT, (б) nginx только `:80 server_name _`, (в) `certbot certificates` пуст, хотя сайт по HTTPS работает.

Следствия для перевода домена:
- **DNS + TLS + маршрутизация — целиком в панели хостинга/у владельца** (добавить домен в панель → edge сам выпускает LE-сертификат). Агент это автоматизировать не может.
- **nginx на боксе трогать не надо** — `server_name _` уже отвечает на любой хост. Новый домен «заработал» без правок vhost.
- Проверка готовности — не «мой IP == DNS», а **`curl --resolve domain:443:<каждый IP>`**: смотреть, что сайт+валидный TLS отдаются со всех IP, в которые домен может резолвиться (у нас DNS был «расщеплён» по двум боксам — оба отдавали сайт).

## 2. Перевод домена: NEXT_PUBLIC_ инлайнится на build, но динам. роуты читают РАНТАЙМ-env

Переключили build-Variable `NEXT_PUBLIC_SERVER_URL` → новый домен + редеплой. **Canonical/og/sitemap/robots уехали на новый (статика, инлайн на build), а VK `redirect_uri` остался СТАРЫМ.** Причина двойная:
- `NEXT_PUBLIC_*` инлайнятся в **статически-генерируемый** вывод на build; но **динамический** route-handler (`force-dynamic`, наш `/api/auth/vk/login`) читает `process.env` в РАНТАЙМЕ — из env systemd-юнита бокса (`EnvironmentFile`), а не из build-значения.
- Плюс приоритет в коде: `vkRedirectUri()` сперва берёт `process.env.VK_REDIRECT_URI` (его пишет наш `apply-vk-secrets` в env бокса), и только потом фолбэк на `NEXT_PUBLIC_SERVER_URL`.

Итог: при смене домена надо переставить **ОБА** места — (1) build-Variable (для статики/canonical) и (2) **рантайм-env бокса** (`NEXT_PUBLIC_SERVER_URL` + спец. `*_REDIRECT_URI`), затем рестарт. Иначе OAuth-redirect (и любой рантайм-чтение домена) останется на старом домене, и вход сломается, если новый redirect_uri не зарегистрирован у провайдера.

Доп. дисциплина (без даунтайма): сначала владелец регистрирует **новый** redirect_uri у провайдера (VK), **оставив старый**; и только потом переключаем env — тогда вход не падает ни на одном домене в момент перехода.

Кандидаты в GOTCHAS: «managed-VPS edge-TLS → не certbot на боксе» и «домен-cutover: NEXT_PUBLIC build-инлайн ≠ рантайм-env для динам. роутов/OAuth-redirect». Действий по нам не требуется — всё на проде, проверено внешне.

— SabantuyMalmyzh
