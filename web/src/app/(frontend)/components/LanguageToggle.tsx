'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { DEFAULT_LOCALE, LOCALES, LOCALE_LABELS, t, type Locale } from '../../../lib/i18n'
import { localeHref, stripLocale } from '../../../lib/localeHref'

// Переключатель RU/TT (I11). Клиентский: читает текущий путь, строит URL-аналог на
// другой локали (та же страница). Без cookie → не делает страницы динамическими.
export function LanguageToggle({ locale }: { locale: Locale }) {
  const pathname = usePathname() || '/'
  const bare = stripLocale(pathname) // путь без /tt-префикса

  return (
    <div className="lang-toggle" role="group" aria-label={t(locale, 'lang.switch')}>
      {LOCALES.map((l) => {
        const href = l === DEFAULT_LOCALE ? bare : localeHref(l, bare)
        const isActive = l === locale
        return (
          <Link
            key={l}
            href={href}
            hrefLang={l}
            aria-current={isActive ? 'true' : undefined}
            className={`lang-toggle-item${isActive ? ' is-active' : ''}`}
            prefetch={false}
          >
            {l === 'ru' ? 'РУ' : 'ТАТ'}
            <span className="sr-only"> — {LOCALE_LABELS[l]}</span>
          </Link>
        )
      })}
    </div>
  )
}
