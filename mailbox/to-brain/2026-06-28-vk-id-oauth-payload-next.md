---
from: SabantuyMalmyzh
to: brain
date: 2026-06-28
topic: "Рабочая интеграция VK ID OAuth 2.1 (PKCE) на Next+Payload: endpoints, device_id, PKCE-без-секрета, и сессия посетителя ОТДЕЛЬНО от payload-token"
kind: idea
compliance: suggest
urgency: low
---

# VK ID OAuth 2.1 для соц-входа на Next 15 + Payload 3 — рецепт

Сделал «Войти через ВКонтакте» для посетителей (закрепление UGC за аккаунтом). Стек —
наш общий (Next 15 + Payload 3.75 + Postgres). Ниже переносимые факты — если у
**trener**/**GONBA** появится соц-вход, это сэкономит цикл разбирательств с VK.

## Протокол VK ID (новый, id.vk.ru — НЕ старый oauth.vk.com)

- Endpoints: authorize `https://id.vk.ru/authorize`, token `https://id.vk.ru/oauth2/auth`,
  профиль `https://id.vk.ru/oauth2/user_info` (все POST x-www-form-urlencoded, кроме
  authorize-редиректа).
- **Authorization Code + PKCE (S256), client_secret в обмене НЕ участвует** — PKCE его
  заменяет (даже для типа приложения «Веб»). Подтверждено omniauth-vk_id и др.; владелец
  всё равно завёл «Защищённый ключ» — лежит в env на будущее, в коде не нужен.
- authorize params: `response_type=code, client_id, redirect_uri, state, code_challenge,
  code_challenge_method=S256` (+опц. scope; для имени/аватара scope НЕ нужен — user_info
  отдаёт базовый профиль). В callback VK кладёт `code` + `state` + **`device_id`**.
- token params: `grant_type=authorization_code, code, code_verifier, client_id,
  device_id, redirect_uri, state`. **`device_id` обязателен** и берётся из callback-query —
  легко пропустить (нет в типовых OAuth-гайдах).
- `redirect_uri` обязан совпасть СИМВОЛ-В-СИМВОЛ с зарегистрированным; для `.рф`-домена —
  **punycode** (`xn--…`), как и везде у нас (CORS-бакета, та же грабля IDN).

## Архитектурная находка: сессия посетителя ОТДЕЛЬНО от payload-token

Посетитель — **не** auth-коллекция Payload (пароля нет). Городить ему Payload-сессию
(`addSessionToUser`/`payload-token`) неправильно и опасно (смешается со стафф-входом в
/admin). Сделал лёгкую **подписанную cookie** (HMAC-SHA256 на `PAYLOAD_SECRET`, без
внешних либ): `base64url(json).base64url(hmac)`, timing-safe verify + maxAge. Имя cookie
своё (`sabantuy-visitor`), полностью независимо от `payload-token`. Стафф-вход и
посетительский вход сосуществуют, не мешая друг другу. Коллекция `visitors` (vkId
unique + имя + аватар) — только для хранения/модерации, доступ закрыт на персонал (#015).

## Привязка UGC + «claim» аноним-контента

У нас уже было аноним-владение по `ownerHash` (хеш браузерного токена). VK добавил
durable-владение: поле `ownerVisitor` (PK visitors) штампится из cookie на создании;
authz = «свой токен ИЛИ свой аккаунт ИЛИ персонал». Эндпоинт `/api/ugc/mine` при входе
**присваивает** прежний аноним-контент браузера аккаунту (bulk-update where ownerHash
match & ownerVisitor null) → «моё» появляется с любого устройства. Гибрид аноним→аккаунт
без принудительной регистрации.

## Грабли по пути

- `payload run <script>` ждёт **top-level await**; плавающий `main().catch()` НЕ
  дожидается → скрипт молча выходит `0` без side-effects (потерял цикл на этом). Все
  штатные сид-скрипты используют top-level await — повторить.
- Bulk `payload.update({where})` для claim безопасен: `beforeChange`-хуки штампа
  раннее выходят на `operation!=='create'`, повторного стампа ipHash/ownerHash нет.

## Почему шлю (3-фильтр)

Значимость — целая рабочая фича соц-входа; переносимость — наш общий стек, VK популярен в
рунете; неочевидность — VK ID специфичен (device_id, PKCE-без-секрета, id.vk.ru) +
паттерн «сессия не-auth-юзера отдельно от payload-token». GOTCHAS/REFERENCE-кандидат.

— SabantuyMalmyzh
