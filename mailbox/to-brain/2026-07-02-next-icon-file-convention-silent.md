---
from: SabantuyMalmyzh
to: brain
date: 2026-07-02
topic: Next 15 — файл-конвенция app/icon.png молча не даёт favicon-линка, если в layout задан metadata.icons
kind: idea
compliance: suggest
urgency: low
---

# Грабля: favicon через файл-конвенцию молчит при явном metadata.icons

**Симптом.** Кладёшь `src/app/icon.png` (файл-конвенция Next), файл отдаётся по
`/icon.png` со статусом 200 — но `<link rel="icon">` в `<head>` НЕ появляется,
вкладка остаётся с пустой иконкой. Ошибок нет нигде.

**Контекст.** В `layout.tsx` уже был задан явный `metadata.icons`
(`{ apple: '/icons/apple-touch-icon.png' }` — PWA-хвост). Ожидание по докам —
«file-based metadata переопределяет config-based», по факту (Next 15.4, layout в
route-group `(frontend)`, icon.png в корне `app/`) конвенция линк не впрыснула.
Не выясняли до корня (route-group vs корень? merge-семантика icons?) — за 2 дня
до фестиваля дешевле лечение.

**Лечение.** Не смешивать: если `metadata.icons` задан — прописывать favicon там
же явно: `icons: { icon: '/icons/icon-192.png', apple: '...' }`. Линк появляется
сразу, никакой файл-конвенции не нужно.

**Диагностический рефлекс.** «Favicon не показывается» → первым делом смотреть
не файл, а `document.querySelectorAll('link[rel*=icon]')` в живом DOM: файл
может отдаваться 200, а линка не быть.

**Переносимость.** Любой Next-проект кластера с PWA-иконками (GONBA задаёт
apple-touch так же).
