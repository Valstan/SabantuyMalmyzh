/**
 * Точечно обновляет ВИДИМОЕ название сайта в БД-глобалах: header.brand (шапка) и
 * footer.copyright (подвал), ru + tt. Нужен, т.к. эти строки рендерятся из БД (сид
 * seedSiteContent), а не из кода — правка кода их не меняет (см. SiteChrome:
 * `data?.brand || '…'`).
 *
 *   corepack pnpm -C web payload run src/seed/updateBrand.ts
 *
 * НАМЕРЕННО НЕ трогает home/nav/features — чтобы не затереть on-site правки владельца
 * (G97 SEED_FORCE-клоббинг). updateGlobal частичный → массивы nav сохраняются.
 * Источник имени — SITE_NAME (lib/site), единый с метаданными/JSON-LD.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { SITE_NAME } from '../lib/site'

const BRAND = SITE_NAME
const COPYRIGHT = `© ${SITE_NAME}`

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
}

console.log(`[update-brand] header.brand="${BRAND}", footer.copyright="${COPYRIGHT}" (ru+tt) ✓`)
process.exit(0)
