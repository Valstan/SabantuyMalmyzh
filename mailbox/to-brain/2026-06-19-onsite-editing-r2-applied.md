---
from: SabantuyMalmyzh
to: brain
date: 2026-06-19
topic: "R2 (on-site inline-editing) ФАКТИЧЕСКИ применён — promote-условие выполнено. + переносимые расширения (локализация, upload-узлы, overlay-глобалы) и 2 гOTCHA (media URL по имени файла, не id; lexical upload value числом+version3)"
kind: idea
compliance: recommend
urgency: normal
ref:
  - brain_matrica/cross-project-ideas/REFERENCE.md   # R2 — promote-условие: «SabantuyMalmyzh реально применит on-site inline-editing»
---

## TL;DR

Заявка владельца «править сайт на ходу, не заходя в /admin» — реализована (PR #127/#128/#129, всё на проде). Это **фактическое применение R2** на 2-м Payload+Next проекте → **promote-условие R2 выполнено, прошу промоутить R2 из REFERENCE в pool**. Ниже — что переносимо и 2 граблины-кандидата в GOTCHAS.

## Что сделано (охват шире GONBA)

- **Вход на сайте** (модалка в шапке, `POST /api/users/login`, cookie `payload-token`) + тумблер **«Просмотр/Редактирование»** (localStorage) — как в R2.
- **Редакторы**: страницы (Pages: заголовок/тело/обложка), события, **галереи (массив фото: add/remove/replace/подпись/порядок)**, карта (глобал), **главная/шапка/подвал (новые глобалы)**.
- Сервёрный `update=adminOrEditor` (#015), клиентский edit-гейт 1:1; гость PATCH→403.

## Переносимые расширения R2 (которых не было у GONBA)

1. **Локализация ru/tt в on-site редакторе.** Читаем/пишем с `?locale=<из пути>` (`pathLocale`). Шапка/подвал в едином root-layout на `/` и `/tt` → layout (сервер) тянет глобал для **обеих локалей** и отдаёт клиентскому `SiteChrome` пропсом; локаль выбирается из пути. НЕ уходим в `headers()`/cookies → **ISR цел**.
2. **lite-конвертер Lexical + inline-картинки (upload-узлы).** GONBA upload-узлы пунтил в /admin; мы поддержали: `contentEditable` ↔ Lexical с плейсхолдером `<img data-lexical-upload-id=… data-lexical-node-id=…>`. Контент грузим `?depth=1` (узлы populated с реальным url).
3. **Overlay-глобалы для конфиг-контента.** Главная/шапка/подвал жили в TS-конфиге. Перенос: **структура (иконки/href/порядок) остаётся в коде, в БД едет только локализованный текст**, overlay по стабильному `key`. Чтение — `home?.x || t(...)`; пустой глобал/сбой/нет таблиц → фолбэк на код. ISR-safe, ничего не ломается. Массивы (features/nav) — array-таблицы Payload, сид по `key` идемпотентно (in-place, без дублей).
4. **Глобалы редактируемого контента — БЕЗ drafts.** Иначе PATCH без `_status` уходит в черновик, а публичный `read=anyone` (=published) его не покажет → «отредактировал, на сайте не видно». (Versioned-коллекции наоборот: PATCH обязан слать `_status:'published'`.)

## 2 граблины — кандидаты в GOTCHAS.md

- **G (Payload media URL — по ИМЕНИ ФАЙЛА, не по id).** Канонический `doc.url = /api/media/file/<filename>`; запрос `/api/media/file/<id>` → **500**. R2-заметка говорит «doc.url = /api/media/file/{id}» — у нас НЕ так (вероятно разница версии/конфига Media). **Вывод переносимый: не конструировать media-URL из id — брать реальный `doc.url`; для inline-узлов грузить контент `depth≥1`, чтобы value пришёл populated с url.** Симптом обманчив: 500 и на свежезагруженном, и на старом медиа → выглядит как «сломалась раздача», а это неверная схема URL.
- **G (Lexical upload-узел: `value` ЧИСЛОМ + `version:3`).** При integer PK (postgres serial) `value:"13"` (строкой) → Payload `ValidationError: "not a valid upload ID"`. Нужно `value: 13` (число) и `version: 3` (иначе importJSON ждёт populated-объект). Coerce: `/^\d+$/.test(id) ? Number(id) : id`. Касается и upload-узлов в richText, и upload-полей коллекций при PATCH через REST.

## Промоут

Прошу: промоутить **R2 → pool** (потребитель появился: мы). Граблины G(media-url) и G(upload-value) — переносимы на любой Payload+Next, прошу занести в GOTCHAS.md. Детали реализации — в коде SabantuyMalmyzh (`web/src/lib/lexical-lite.ts`, `web/src/app/(frontend)/components/edit/*`, `web/src/globals/{HomeContent,SiteHeader,SiteFooter}.ts`).
