'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { t } from '../../../lib/i18n'
import { localeHref, pathLocale } from '../../../lib/localeHref'
import { getCultureSections } from '../../../lib/cultureSections'
import { InstallAppButton } from './InstallAppButton'
import { LanguageToggle } from './LanguageToggle'
import { VisitorAuth } from './VisitorAuth'
import { LiveInternetCounter } from './LiveInternetCounter'
import { SectionDivider } from './SectionDivider'
import { LoginControl } from './edit/LoginControl'
import { HeaderEditor } from './edit/HeaderEditor'
import { FooterEditor } from './edit/FooterEditor'

// Редактируемые тексты шапки/подвала из глобалов (on-site PR3). Сервер (layout)
// тянет ОБЕ локали и отдаёт сюда пропсом; локаль выбирается из пути. null/пусто →
// фолбэк на код/i18n (текущее поведение). Структура (порядок/href) — здесь, в коде.
type ChromeLocaleData = { brand: string | null; nav: { key: string; label: string | null }[]; copyright: string | null }
export type ChromeContent = { ru: ChromeLocaleData; tt: ChromeLocaleData } | null

// Пункты меню: ключ (для overlay подписи из БД) + адрес + i18n-фолбэк. Порядок и
// адреса — в коде; редактор меняет только подписи (по ключу).
const NAV_LINKS: { key: string; path: string; i18nKey: string }[] = [
  { key: 'schedule', path: '/', i18nKey: 'nav.schedule' },
  { key: 'gallery', path: '/gallery', i18nKey: 'nav.gallery' },
  { key: 'map', path: '/map', i18nKey: 'nav.map' },
  { key: 'game', path: '/igra', i18nKey: 'nav.game' },
  { key: 'lenta', path: '/lenta', i18nKey: 'nav.lenta' },
  { key: 'efir', path: '/efir', i18nKey: 'nav.efir' },
  { key: 'about', path: '/o-sabantuy', i18nKey: 'nav.about' },
  { key: 'contacts', path: '/kontakty', i18nKey: 'nav.contacts' },
]

// Locale-aware «обвязка» сайта (шапка + подвал + переключатель языка). Клиентский
// компонент: локаль берём из пути (usePathname → pathLocale). usePathname работает и
// в SSR, и на клиенте → без мерцания; и НЕ делает страницы динамическими (ISR цел,
// в отличие от чтения cookie/headers на сервере). Рендерится один раз в root-layout,
// корректно обслуживает и ru (/), и tt (/tt) поддеревья.
export function SiteChrome({ children, chrome }: { children: React.ReactNode; chrome?: ChromeContent }) {
  const pathname = usePathname() || '/'
  const locale = pathLocale(pathname)
  const h = (path: string) => localeHref(locale, path)

  // Overlay подписей из БД (по ключу), фолбэк — i18n/код.
  const data = chrome ? chrome[locale] : null
  const navOv: Record<string, string | null> = Object.fromEntries((data?.nav || []).map((n) => [n.key, n.label]))
  const navLabel = (key: string, i18nKey: string) => navOv[key] || t(locale, i18nKey)
  const brand = data?.brand || 'Сабантуй Малмыж'
  const copyright = data?.copyright || '© Сабантуй Малмыж'

  // <html lang> делаем локале-зависимым. Корневой layout — единый на оба поддерева
  // и SSR-ит жёсткий lang="ru"; перенести локаль на сервер можно лишь через
  // [locale]-рестракт или dynamic headers() (убил бы ISR) — несоразмерно для
  // low-severity атрибута. Поэтому правим lang под фактическую локаль после
  // гидрации — стандартный приём для path-based i18n; без hydration-mismatch
  // (императивная правка <html>, не React-рендер). SEO уже закрыт hreflang (PR #111).
  React.useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <>
      <header className="site-header">
        <div className="container site-nav">
          {/* Ряд 1: бренд слева + блок входа справа (язык / VK / редактор) */}
          <div className="site-nav-top">
            <Link className="site-brand" href={h('/')}>
              {brand}
            </Link>
            <span className="site-nav-actions">
              <LanguageToggle locale={locale} />
              <VisitorAuth locale={locale} />
              <HeaderEditor locale={locale} />
            </span>
          </div>
          {/* Ряд 2: меню-ссылки (переносятся аккуратно) */}
          <nav className="site-nav-links" aria-label={t(locale, 'nav.primary')}>
            {NAV_LINKS.map((l) => (
              <Link key={l.key} href={h(l.path)}>
                {navLabel(l.key, l.i18nKey)}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {children}

      <footer className="site-footer">
        {/* Декоративный силуэт Малмыжа (церковь, мечеть, крыши) лентой над подвалом */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="footer-skyline" src="/decor/footer-skyline.png" alt="" aria-hidden="true" />
        <nav className="footer-nav" aria-label={t(locale, 'footer.sections')}>
          {/* Основные пункты (кроме «Контакты»), затем культ-разделы, затем «Контакты»
              последним — устойчиво к числу пунктов меню. */}
          {NAV_LINKS.filter((l) => l.key !== 'contacts').map((l) => (
            <Link key={l.key} href={h(l.path)}>
              {navLabel(l.key, l.i18nKey)}
            </Link>
          ))}
          {getCultureSections(locale).map((s) => (
            <Link key={s.href} href={h(s.href)}>
              {s.title}
            </Link>
          ))}
          {NAV_LINKS.filter((l) => l.key === 'contacts').map((l) => (
            <Link key={l.key} href={h(l.path)}>
              {navLabel(l.key, l.i18nKey)}
            </Link>
          ))}
        </nav>
        {/* «Установить приложение» — заметная точка входа к PWA-установке на телефон.
            Сам компонент решает, показываться ли (есть нативный промпт / iOS / уже стоит). */}
        <InstallAppButton locale={locale} />
        <div style={{ maxWidth: 220, margin: '0 auto 0.85rem' }}>
          <SectionDivider variant="vine" />
        </div>
        {copyright} ·{' '}
        <Link href={h('/privacy')} prefetch={false}>
          {t(locale, 'footer.privacy')}
        </Link>{' '}
        ·{' '}
        <Link href="/admin" prefetch={false}>
          {t(locale, 'footer.admin')}
        </Link>{' '}
        ·{' '}
        <LoginControl label={t(locale, 'footer.editorLogin')} className="footer-admin-login" />
        <FooterEditor locale={locale} />
        <LiveInternetCounter />
      </footer>
    </>
  )
}
