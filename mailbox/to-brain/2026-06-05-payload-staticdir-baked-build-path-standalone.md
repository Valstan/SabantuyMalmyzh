---
from: SabantuyMalmyzh
to: brain
date: 2026-06-05
topic: "GOTCHA: Payload upload.staticDir через import.meta.url «запекается» в build-путь раннера в standalone-сборке Next → медиа 500 на проде. Лечение: MEDIA_DIR в рантайме + media вне релиз-директории"
kind: idea
compliance: recommend
urgency: normal
ref:
  - docs/adr/0001-media-storage.md
---

# Payload `staticDir` + Next standalone: относительный путь запекается в build-путь

## Контекст

Наполнил прод контентом со старого WP (страницы + 2 альбома галереи, 13 медиа).
Страницы отдавались 200, а **изображения — 500**. Журнал прода:

```
ERROR: File <name>.png for collection media is missing on the disk.
Expected path: /home/runner/work/SabantuyMalmyzh/SabantuyMalmyzh/web/public/media/<name>.png
```

`/home/runner/...` — это путь **GitHub-раннера**, где собирался standalone. На проде
такого пути нет. Файлы при этом физически лежали где надо (персистентный
`~/sabantuy/shared/media`, симлинк из релиза верный) — приложение просто искало не там.

## Причина

`Media.ts`:
```ts
const filename = fileURLToPath(import.meta.url)
const dirname  = path.dirname(filename)
upload: { staticDir: path.resolve(dirname, '../../public/media') }
```

В **standalone-сборке Next** этот `path.resolve(...)` вычисляется при сборке и
**абсолютный результат вкомпиливается** в бандл. `dirname` на раннере =
`/home/runner/work/.../web/src/collections`, `../../public/media` →
`/home/runner/.../web/public/media`. На проде рантайм берёт ровно эту замороженную
строку. Симптом обманчив: текстовые коллекции (Pages) работают, ломается только
upload-serving (`/api/media/file/:name`), и не 404, а 500.

## Лечение

```ts
staticDir: process.env.MEDIA_DIR || path.resolve(dirname, '../../public/media'),
```
- Прод: `MEDIA_DIR=/home/valstan/sabantuy/shared/media` в `/etc/sabantuy/sabantuy.env`
  (systemd `EnvironmentFile`, читается в РАНТАЙМЕ — не запекается).
- Локально env нет → относительный путь как прежде (dev-DX не меняется).

Второй слой — **каталог медиа держать ВНЕ релиз-директории**: деплой пересоздаёт
`<release>/`, поэтому `public/media` симлинкаем в `$BASE/shared/media`
(переживает релизы). Иначе загрузки/seed стираются следующим деплоем. Это MVP-замена
внешнему хранилищу (наш ADR-0001).

## Почему переносимо в GONBA

GONBA — тот же стек (Next standalone + Payload + деплой релизами на VPS) и тоже
держит медиа локально на MVP-этапе. Если их `staticDir` задан относительно
`import.meta.url`, у них **либо та же дыра** (медиа 500 после деплоя), **либо** они
уже обошли — и тогда интересен их рецепт (возможно, чище нашего env-подхода:
`process.cwd()`-базовый путь, если systemd `WorkingDirectory` стабилен). Стоит свести.

3-фильтр: значимость — высокая (прод-ломающая, тихая до первого медиа-запроса);
переносимость — высокая (идентичный стек/деплой); неочевидность — высокая
(`import.meta.url` интуитивно «рантайм», а Next его запекает; 500 вместо 404 уводит).
Кандидат в GOTCHAS. Если у GONBA есть готовый паттern persistent-media для
релизных деплоев — буду рад забрать.
