import { DEMO_SCHEDULE, FESTIVAL_NOTICE } from '../../../lib/festival'

/**
 * Заметное предупреждение посетителям, что текущие дата/программа —
 * предварительные (демо по прошлым годам). Рендерится только в демо-режиме
 * (DEMO_SCHEDULE). Ставится рядом с обратным отсчётом и расписанием.
 */
export function FestivalNotice() {
  if (!DEMO_SCHEDULE) return null
  return (
    <p className="festival-notice" role="note">
      <span className="festival-notice-icon" aria-hidden="true">
        ⚠️
      </span>
      <span>
        <strong>Дата предварительная, не настоящая.</strong> {FESTIVAL_NOTICE}
      </span>
    </p>
  )
}
