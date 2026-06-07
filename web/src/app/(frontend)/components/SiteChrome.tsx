'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { t } from '../../../lib/i18n'
import { localeHref, pathLocale } from '../../../lib/localeHref'
import { getCultureSections } from '../../../lib/cultureSections'
import { LanguageToggle } from './LanguageToggle'
import { SectionDivider } from './SectionDivider'

// Locale-aware «обвязка» сайта (шапка + подвал + переключатель языка). Клиентский
// компонент: локаль берём из пути (usePathname → pathLocale). usePathname работает и
// в SSR, и на клиенте → без мерцания; и НЕ делает страницы динамическими (ISR цел,
// в отличие от чтения cookie/headers на сервере). Рендерится один раз в root-layout,
// корректно обслуживает и ru (/), и tt (/tt) поддеревья.
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const locale = pathLocale(pathname)
  const h = (path: string) => localeHref(locale, path)

  return (
    <>
      <header className="site-header">
        <div className="container site-nav" style={{ padding: 0 }}>
          <Link className="site-brand" href={h('/')}>
            Сабантуй&nbsp;Малмыж
          </Link>
          <nav className="site-nav-links" aria-label={t(locale, 'nav.primary')}>
            <Link href={h('/')}>{t(locale, 'nav.schedule')}</Link>
            <Link href={h('/gallery')}>{t(locale, 'nav.gallery')}</Link>
            <Link href={h('/map')}>{t(locale, 'nav.map')}</Link>
            <Link href={h('/o-sabantuy')}>{t(locale, 'nav.about')}</Link>
            <Link href={h('/kontakty')}>{t(locale, 'nav.contacts')}</Link>
          </nav>
          <LanguageToggle locale={locale} />
        </div>
      </header>

      {children}

      <footer className="site-footer">
        <nav className="footer-nav" aria-label={t(locale, 'footer.sections')}>
          <Link href={h('/')}>{t(locale, 'nav.schedule')}</Link>
          <Link href={h('/gallery')}>{t(locale, 'nav.gallery')}</Link>
          <Link href={h('/map')}>{t(locale, 'nav.map')}</Link>
          <Link href={h('/o-sabantuy')}>{t(locale, 'nav.about')}</Link>
          {getCultureSections(locale).map((s) => (
            <Link key={s.href} href={h(s.href)}>
              {s.title}
            </Link>
          ))}
          <Link href={h('/kontakty')}>{t(locale, 'nav.contacts')}</Link>
        </nav>
        <div style={{ maxWidth: 220, margin: '0 auto 0.85rem' }}>
          <SectionDivider variant="vine" />
        </div>
        © Сабантуй Малмыж ·{' '}
        <Link href={h('/privacy')} prefetch={false}>
          {t(locale, 'footer.privacy')}
        </Link>{' '}
        ·{' '}
        <Link href="/admin" prefetch={false}>
          {t(locale, 'footer.admin')}
        </Link>
      </footer>
    </>
  )
}
