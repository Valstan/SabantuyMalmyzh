---
from: SabantuyMalmyzh
to: brain
date: 2026-06-27
topic: "Payload-грабля: count/update/findByID в afterChange-хуке БЕЗ req идут вне транзакции → счётчики-агрегаты отстают на 1"
kind: idea
compliance: suggest
urgency: normal
ref:
  - cross-project-ideas/GOTCHAS.md
  - cross-project-ideas/REFERENCE.md   # рецепты Payload+Next (R3 push-inspect миграции)
---

# Находка (suggest, normal): Payload local-API в хуках обязан получать `req` (транзакция)

## Контекст

PR3 «Народной ленты»: коллекции `submission-reactions`/`submission-comments`/
`content-reports`. Агрегаты-счётчики (`likeCount`/`commentCount`/`reportCount`)
живут на родительской записи и пересчитываются хуком `afterChange` через
`payload.count(...)` + `payload.update(...)`. Жалобы на пороге авто-скрывают цель.

## Симптом

Счётчики стабильно **отставали на 1**: 2 лайка → `likeCount=1`; 1 коммент →
`commentCount=0`; 3 жалобы → `reportCount=2`, и авто-скрытие (порог 3) **не
срабатывало**, т.к. хук видел только 2. Не падение, не ошибка — тихий off-by-one.

## Причина

Payload v3 (postgres) выполняет операцию записи в **транзакции**; `afterChange`
бежит ВНУТРИ неё, ДО коммита. Если в хуке вызвать `payload.count/update/findByID`
**без передачи `req`**, вызов идёт по **другому соединению/вне транзакции** и не
видит только что вставленную (ещё не закоммиченную) строку → COUNT занижен на 1.

## Лечение

Передавать `req` во ВСЕ local-API вызовы внутри хуков:

```ts
const { totalDocs } = await req.payload.count({
  collection: 'submission-reactions',
  where: { submission: { equals: id } },
  overrideAccess: true,
  req,                       // ← без этого вызов вне транзакции, off-by-one
})
await req.payload.update({ collection: 'submissions', id, data: { likeCount: totalDocs }, overrideAccess: true, req })
```

Это же касается `findByID` (проверка статуса цели) и `update` (авто-скрытие). После
добавления `req` всё сошлось: лайки=2, комменты=1, 3 жалобы→auto-hide.

## Почему стоит занести

- **Переносимо:** любой Payload-проект, который считает агрегаты/счётчики/«авто-
  модерацию на пороге» через хуки (GONBA/MatricaRMZ — тот же стек). Классический
  паттерн «счётчик на родителе из дочерней коллекции».
- **Неочевидно и тихо:** не крэш, а off-by-one; наивный смоук «вернулся 201» проходит.
  Поймали только потому, что проверяли **число в БД**, а не код ответа.
- **Бонус-урок к смоукам:** проверять побочный эффект (значение счётчика/статус),
  а не только HTTP-код — иначе транзакционные/агрегатные баги проскакивают.

Кандидат в GOTCHAS («Payload: local-API в хуке без `req` = вне транзакции, агрегаты
off-by-one; всегда прокидывай `req`»). Рядом с рецептами Payload+Next (R3/R10).

— SabantuyMalmyzh
