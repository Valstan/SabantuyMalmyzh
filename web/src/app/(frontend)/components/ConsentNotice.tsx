'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { t } from '../../../lib/i18n'
import { localeHref, pathLocale } from '../../../lib/localeHref'

/**
 * Ненавязчивое уведомление об аналитике/cookie (152-ФЗ + требование Яндекса
 * уведомлять). НЕ блокирует сайт: лента внизу, закрывается кнопкой; выбор живёт
 * в localStorage. Локаль — из пути (как SiteChrome). До монтирования не рендерим
 * (иначе hydration-mismatch + мелькание у тех, кто уже закрыл).
 */
const KEY = 'sabantuy:consent-ok'

export function ConsentNotice() {
  const pathname = usePathname() || '/'
  const locale = pathLocale(pathname)
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) == null) setShow(true)
    } catch {
      /* приватный режим — покажем плашку, это не критично */
      setShow(true)
    }
  }, [])

  if (!show) return null

  function dismiss() {
    setShow(false)
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* приватный режим — просто скроем на эту сессию */
    }
  }

  return (
    <div className="consent" role="region" aria-label={t(locale, 'consent.aria')}>
      <p className="consent-text">
        {t(locale, 'consent.text')}{' '}
        <Link href={localeHref(locale, '/privacy')} prefetch={false}>
          {t(locale, 'consent.more')}
        </Link>
      </p>
      <button type="button" className="btn-gold consent-btn" onClick={dismiss}>
        {t(locale, 'consent.accept')}
      </button>
    </div>
  )
}
