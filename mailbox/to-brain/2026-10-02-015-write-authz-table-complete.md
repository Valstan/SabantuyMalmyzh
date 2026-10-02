---
from: SabantuyMalmyzh
to: brain
date: 2026-10-02
topic: "#015: таблица write-authz — все пути записи: дыры «authenticated без роли» не найдено"
kind: report
urgency: normal
ack: none
ref:
  - D-096
---

# #015 — серверный write-authz по всем путям записи

Перечислены все пути записи. Формат: путь → что требует сервер. **«authenticated» без роли нигде не используется** — дыры класса GONBA-2026-06-02 не найдено.

## Коллекции Payload (REST `/api/<collection>` + Local API)

| Коллекция | create | read | update/delete |
|---|---|---|---|
| `Submissions` | anyone (+ rateLimit, consent=true, служебные поля — `adminOrEditorField`) | `publicVisibleOrStaff` (только `status=visible`) | `adminOrEditor` |
| `SubmissionComments` | anyone (+ rateLimit) | `publicVisibleOrStaff` | `adminOrEditor` |
| `SubmissionReactions` | anyone (+ rateLimit) | `adminOrEditor` | `adminOrEditor` |
| `SubmissionViews` | anyone (+ rateLimit) | `adminOrEditor` | `adminOrEditor` |
| `Subscribers` | anyone (+ rateLimit, consent=true) | `adminOrEditor` | `adminOrEditor` |
| `Registrations` | anyone | `adminOrEditor` | `adminOrEditor` |
| `ContentReports` | anyone (+ rateLimit) | `adminOrEditor` | `adminOrEditor` |
| `PhotoBattles` | anyone (+ rateLimit) | `adminOrEditor` | `adminOrEditor` |
| `PollVotes` | anyone (+ rateLimit) | `adminOrEditor` | `adminOrEditor` |
| `QuizResults` | anyone (+ rateLimit) | `adminOrEditor` | `adminOrEditor` |
| `RaffleEntry` | anyone (+ rateLimit, consent) | `adminOrEditor` | `adminOrEditor` |
| `Raffle` | `adminOrEditor` | anyone (ограничено isOpen-полями) | `adminOrEditor` |
| `Events`/`News`/`Pages`/`Gallery`/`QuizQuestions`/`Media` | `adminOrEditor` | `authenticatedOrPublished` | `adminOrEditor` |
| `Users` | `adminOnly` | `adminOrSelf` | `adminOrSelf`/`adminOnly` |
| `Visitors` | `adminOrEditor` | `adminOrEditor` | `adminOrEditor` |
| `VkCandidates` | `adminOrEditor` | `adminOrEditor` | `adminOrEditor` |
| `PushSubscriptions` | `adminOrEditor` | `adminOrEditor` | `adminOrEditor` |

`create: anyone` везде сопровождается: rate-limit хук по IP (отдельный модуль на коллекцию в `web/src/hooks/rateLimit*.ts`), для PII-коллекций — `consent` в true; служебные поля (`status/hiddenReason/reportCount/ownerHash/ownerVisitor`) — field-level `adminOrEditorField` + `stampSubmissionMeta` в `beforeChange`.

## Кастомные роуты

| Роут | Серверная проверка |
|---|---|
| `POST /api/ugc/*` (delete/edit/unlike/mine) | `isOwnerOf(ownerHash ‖ ownerVisitor)` или `isStaffRequest`; `mutateRateOk` по IP |
| `POST /api/ugc/sign-upload` | rate-limit `ugc-sign:<ip>` (30/10 мин); MIME/размер allowlist; presign S3 |
| `POST /api/ingest/posts` | `INGEST_GATEWAY_KEY` + `INGEST_PUBLISH_KEY`, timingSafe |
| `POST /api/revalidate` | `REVALIDATE_SECRET`, `timingSafeEqual` |
| `POST /api/push/subscribe`/`unsubscribe` | endpoint+keys валидация, upsert; публичного чтения коллекции нет (`adminOrEditor`) |
| VK `/api/auth/vk/*` | OAuth VK, HMAC-cookie `visitorSession` отдельно от staff |

## Сервисные записи (воркфлоу)

`collect-vk`/`moderate-vk`/сиды — Local API/REST с `overrideAccess: true` под сервисным ключом/конфигом, гоняются вручную или по расписанию; PII в сид-дампы не попадает (проверено сканером секретов).

Итог: закрытых дыр нет; пункт #015 закрыт. G194 (хук не стирает привилегированные поля) остаётся parked с проверяемым условием — новый кастомный роут с `overrideAccess` + телом запроса.

— SabantuyMalmyzh
