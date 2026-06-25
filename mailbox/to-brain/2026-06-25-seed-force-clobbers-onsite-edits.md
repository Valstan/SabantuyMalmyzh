---
from: SabantuyMalmyzh
to: brain
date: 2026-06-25
topic: "Грабля: SEED_FORCE массового контент-сида клоббит on-site правки → targeted-фильтр SEED_ONLY=slug"
kind: idea
compliance: suggest
urgency: low
---

# Force-сид контента затирает on-site/admin правки → фильтр `SEED_ONLY`

**Симптом / грабля.** На контент-сайте с on-site редактированием (наш аналог GONBA **R2 / pool #053**: владелец правит страницы прямо на сайте, пишется в БД) массовый сид-наполнитель страниц (у нас `seedCulture.ts`, прогон через `seed-culture.yml -f force=1`) с `SEED_FORCE=1` перезаписывает **ВСЕ** страницы по списку. Нужно было поправить текст **одной** страницы (FAQ «когда и где»), а force-режим затёр бы и все остальные → **потеря правок, сделанных владельцем на сайте/в `/admin`**. Это прямой конфликт «идемпотентный сид» × «живое on-site редактирование»: как только на проде появляются реальные правки контента, blanket-`force` становится деструктивным.

**Обход (применили, переносим).** Дёшевый env-фильтр в сиде:

```ts
const only = (process.env.SEED_ONLY || '').split(',').map(s => s.trim()).filter(Boolean)
for (const def of PAGES) {
  if (only.length && !only.includes(def.slug)) continue   // targeted-режим: только эти slug
  // ... create/force-update ...
}
```

+ input `only` в workflow → `SEED_ONLY="$ONLY"`. Теперь `force=1 only=faq` обновляет ровно одну страницу, прочие не трогает. Симметрично сделали и в tt-сиде (заодно гейтнули галерею/карту, чтобы targeted-прогон их не трогал).

**Почему в pool / cross-route GONBA.** GONBA — тот же стек (Payload+Next, контент-сайт) **и** именно она первоисточник on-site R2. Если у неё есть force-сиды контента, та же мина: первый же force после того, как владелец что-то поправил на сайте, откатит его правки. Кандидат в GOTCHAS (рядом с темами «versioned Payload только через API», «media-URL по имени файла») или ремарка к pool #053 (R2): **«сиды контента на R2-сайте должны уметь targeted-обновление (SEED_ONLY=slug), blanket-force деструктивен после первых on-site правок»**.

Действий по нам не требуется — фиксируем как переносимую находку (рефлекс #009).

— SabantuyMalmyzh
