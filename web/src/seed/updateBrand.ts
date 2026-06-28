/**
 * Точечно обновляет ВИДИМОЕ название сайта в БД-глобалах: header.brand (шапка),
 * footer.copyright (подвал) и home.heroTitleAccent (золотой акцент в заголовке героя,
 * рендерится «Сабантуй в <accent>»), ru + tt. Нужен, т.к. эти строки рендерятся из БД
 * (сид seedSiteContent), а не из кода — правка кода их не меняет (фолбэк только когда
 * глобал пуст). См. SiteChrome `data?.brand || …` и HomeView `home?.heroTitleAccent || …`.
 *
 *   corepack pnpm -C web payload run src/seed/updateBrand.ts
 *
 * НАМЕРЕННО частичный updateGlobal (только эти поля) → массивы home/nav (features/
 * cultureCards/nav) и прочий текст СОХРАНЯЮТСЯ, on-site правки владельца не затираются
 * (G97 SEED_FORCE-клоббинг). Источник имени — SITE_NAME (lib/site), единый с метаданными.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { SITE_NAME } from '../lib/site'

const BRAND = SITE_NAME
const COPYRIGHT = `© ${SITE_NAME}`
const HERO_ACCENT = 'Малмыже' // герой: «Сабантуй в <accent>»

const payload = await getPayload({ config })

for (const locale of ['ru', 'tt'] as const) {
  await payload.updateGlobal({
    slug: 'header',
    locale,
    overrideAccess: true,
    context: { disableRevalidate: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { brand: BRAND } as any,
  })
  await payload.updateGlobal({
    slug: 'footer',
    locale,
    overrideAccess: true,
    context: { disableRevalidate: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { copyright: COPYRIGHT } as any,
  })
  await payload.updateGlobal({
    slug: 'home',
    locale,
    overrideAccess: true,
    context: { disableRevalidate: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { heroTitleAccent: HERO_ACCENT } as any,
  })
}

console.log(
  `[update-brand] header.brand="${BRAND}", footer.copyright="${COPYRIGHT}", home.heroTitleAccent="${HERO_ACCENT}" (ru+tt) ✓`,
)
process.exit(0)
