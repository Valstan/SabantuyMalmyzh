/**
 * Сид редактируемых текстов сайта (глобалы home / header / footer) — on-site PR3.
 *
 *   corepack pnpm -C web payload run src/seed/seedSiteContent.ts
 *
 * Заливает в БД текущие тексты главной/шапки/подвала (ru + tt-черновик) и КЛЮЧИ
 * строк-массивов (features/cultureCards/nav), чтобы on-site редактор сразу показывал
 * строки для правки. Идемпотентно: строки массивов сопоставляются по `key` (на повторе
 * обновляются на месте, без дублей). Структура (иконки/href/порядок) — в коде; здесь
 * только видимый текст. После сида HomeView/SiteChrome читают глобалы (с фолбэком на код).
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { getCultureSections } from '../lib/cultureSections'
import { getFeatures } from '../lib/sabantuyFeatures'

/* eslint-disable @typescript-eslint/no-explicit-any -- seed-утилита: Payload data untyped */
const log = (...a: unknown[]) => console.log('[seed-site-content]', ...a)

const NAV = [
  { key: 'schedule', ru: 'Расписание', tt: 'Программа' },
  { key: 'gallery', ru: 'Галерея', tt: 'Галерея' },
  { key: 'map', ru: 'Карта', tt: 'Карта' },
  { key: 'game', ru: 'Игра', tt: 'Уен' },
  { key: 'about', ru: 'О фестивале', tt: 'Фестиваль турында' },
  { key: 'contacts', ru: 'Контакты', tt: 'Багланышлар' },
]

const BRAND = 'Сабантуй Малмыж'
const COPYRIGHT = '© Сабантуй в Малмыже'

const payload = await getPayload({ config })

const idMap = (rows: any[] | undefined) =>
  Object.fromEntries((Array.isArray(rows) ? rows : []).map((r) => [r.key, r.id]))

// ─── HOME ────────────────────────────────────────────────────────────────────
{
  const featRu = getFeatures('ru')
  const featTt = getFeatures('tt')
  const cultRu = getCultureSections('ru')
  const cultTt = getCultureSections('tt')

  // существующие id строк (для idempotent in-place при повторе)
  const before: any = await payload.findGlobal({ slug: 'home', locale: 'ru', overrideAccess: true }).catch(() => ({}))
  const featIds0 = idMap(before?.features)
  const cultIds0 = idMap(before?.cultureCards)

  await payload.updateGlobal({
    slug: 'home',
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: {
      heroEyebrow: 'Народный праздник Малмыжа',
      heroTitleAccent: 'Малмыж',
      heroTagline: 'Праздник труда, силы и дружбы народов — каждое лето на малмыжской земле.',
      featuresEyebrow: 'Что вас ждёт',
      featuresTitle: 'Праздник для всей семьи',
      features: featRu.map((f) => ({ ...(featIds0[f.key] ? { id: featIds0[f.key] } : {}), key: f.key, title: f.title, text: f.text })),
      cultureEyebrow: 'О празднике',
      cultureTitle: 'Традиции и культура',
      cultureLead: 'Откуда пришёл Сабантуй, кто живёт на малмыжской земле и что ждёт вас на майдане.',
      cultureCards: cultRu.map((c) => ({ ...(cultIds0[c.key] ? { id: cultIds0[c.key] } : {}), key: c.key, title: c.title, text: c.text })),
    } as any,
  })

  const ru: any = await payload.findGlobal({ slug: 'home', locale: 'ru', overrideAccess: true })
  const featIds = idMap(ru.features)
  const cultIds = idMap(ru.cultureCards)

  await payload.updateGlobal({
    slug: 'home',
    locale: 'tt',
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: {
      heroEyebrow: 'Малмыжның халык бәйрәме',
      heroTitleAccent: 'Малмыж',
      heroTagline: 'Хезмәт, көч һәм халыклар дуслыгы бәйрәме — һәр җәйне Малмыж җирендә.',
      featuresEyebrow: 'Сезне нәрсә көтә',
      featuresTitle: 'Бөтен гаилә өчен бәйрәм',
      features: featTt.map((f) => ({ id: featIds[f.key], key: f.key, title: f.title, text: f.text })),
      cultureEyebrow: 'Бәйрәм турында',
      cultureTitle: 'Йолалар һәм мәдәният',
      cultureLead: 'Сабантуй каян килгән, Малмыж җирендә кем яши һәм мәйданда сезне нәрсә көтә.',
      cultureCards: cultTt.map((c) => ({ id: cultIds[c.key], key: c.key, title: c.title, text: c.text })),
    } as any,
  })
  log('✓ home (ru + tt):', featRu.length, 'features,', cultRu.length, 'culture cards')
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
{
  const before: any = await payload.findGlobal({ slug: 'header', locale: 'ru', overrideAccess: true }).catch(() => ({}))
  const navIds0 = idMap(before?.nav)

  await payload.updateGlobal({
    slug: 'header',
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: {
      brand: BRAND,
      nav: NAV.map((n) => ({ ...(navIds0[n.key] ? { id: navIds0[n.key] } : {}), key: n.key, label: n.ru })),
    } as any,
  })

  const ru: any = await payload.findGlobal({ slug: 'header', locale: 'ru', overrideAccess: true })
  const navIds = idMap(ru.nav)

  await payload.updateGlobal({
    slug: 'header',
    locale: 'tt',
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: { brand: BRAND, nav: NAV.map((n) => ({ id: navIds[n.key], key: n.key, label: n.tt })) } as any,
  })
  log('✓ header (ru + tt):', NAV.length, 'nav items')
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────
{
  await payload.updateGlobal({ slug: 'footer', overrideAccess: true, context: { disableRevalidate: true }, data: { copyright: COPYRIGHT } as any })
  await payload.updateGlobal({ slug: 'footer', locale: 'tt', overrideAccess: true, context: { disableRevalidate: true }, data: { copyright: COPYRIGHT } as any })
  log('✓ footer (ru + tt)')
}

log('Готово.')
process.exit(0)
