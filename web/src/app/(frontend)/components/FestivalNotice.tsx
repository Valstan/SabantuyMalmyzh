import { DEMO_SCHEDULE } from '../../../lib/festival'
import { t, type Locale } from '../../../lib/i18n'

/**
 * Заметное предупреждение посетителям, что текущие дата/программа — предварительные
 * (демо). Рендерится только в демо-режиме (DEMO_SCHEDULE). Локализовано (I11).
 */
export function FestivalNotice({ locale = 'ru' }: { locale?: Locale }) {
  if (!DEMO_SCHEDULE) return null
  return (
    <p className="festival-notice" role="note">
      <span className="festival-notice-icon" aria-hidden="true">
        ⚠️
      </span>
      <span>{t(locale, 'festival.demoNotice')}</span>
    </p>
  )
}
