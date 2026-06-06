import React from 'react'

/**
 * Реестр inline-SVG мотивов праздника (currentColor → тема через CSS).
 * Линейные иконки, viewBox 24×24. Используются в фича-ряду и акцентах.
 * Не emoji — чтобы на крупных карточках было чётко и в едином стиле.
 */
export type MotifName =
  | 'tulip'
  | 'koresh'
  | 'horse'
  | 'pole'
  | 'cuisine'
  | 'concert'
  | 'kids'
  | 'peoples'
  | 'scroll'
  | 'compass'
  | 'question'

const PATHS: Record<MotifName, React.ReactNode> = {
  // Тюльпан — главный татарский мотив
  tulip: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13c-4 0-6-4-5.5-7.5C8.5 8 10 8 12 6c2 2 3.5 2 5.5-.5C18 9 16 13 12 13Z" />
      <path d="M9 6.5C9 9 10 11 12 13" />
      <path d="M15 6.5C15 9 14 11 12 13" />
      <path d="M12 17c-2-1-4 0-5 2" />
    </>
  ),
  // Көрәш — борьба на поясах (две фигуры, кушак)
  koresh: (
    <>
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="6" r="2" />
      <path d="M8 8q4 3 8 0" />
      <path d="M7 11q5-2 10 0" />
      <path d="M9 11l-1 8M11 12v7M13 12v7M15 11l1 8" />
    </>
  ),
  // Скачки — подкова на счастье
  horse: (
    <>
      <path d="M7.5 19C4 15 4 8 8 5c2-1.6 6-1.6 8 0 4 3 4 10 .5 14" />
      <circle cx="6.4" cy="9.5" r="0.6" />
      <circle cx="17.6" cy="9.5" r="0.6" />
      <circle cx="7.6" cy="14" r="0.6" />
      <circle cx="16.4" cy="14" r="0.6" />
    </>
  ),
  // Столб — лазание за призом
  pole: (
    <>
      <path d="M12 21V6" />
      <path d="M7 21h10" />
      <path d="M12 6h5l-2 1.5L17 9h-5" />
      <circle cx="12" cy="4.5" r="1" />
    </>
  ),
  // Национальная кухня — казан с паром
  cuisine: (
    <>
      <path d="M5 12h14l-1.5 7c-.4 1-1.3 1.5-2.5 1.5H9c-1.2 0-2.1-.5-2.5-1.5Z" />
      <path d="M4 12h16" />
      <path d="M5 13c-1.5 0-1.5 2 0 2M19 13c1.5 0 1.5 2 0 2" />
      <path d="M9 4c-1 2 1 3 0 5M14 4c-1 2 1 3 0 5" />
    </>
  ),
  // Концерт и танцы — ноты
  concert: (
    <>
      <path d="M9 14V5l6-1v9" />
      <path d="M9 8l6-1" />
      <circle cx="7.5" cy="15" r="1.8" />
      <circle cx="13.5" cy="14" r="1.8" />
    </>
  ),
  // Детям — воздушный змей
  kids: (
    <>
      <path d="M12 3l6 7-6 7-6-7Z" />
      <path d="M12 3v14M6 10h12" />
      <path d="M12 17q1 1.5 0 3t0 3" />
    </>
  ),
  // Народы края — две фигуры рядом (дружба народов)
  peoples: (
    <>
      <circle cx="8" cy="8" r="2.4" />
      <path d="M3.8 19c0-3 1.9-5 4.2-5s4.2 2 4.2 5" />
      <circle cx="16" cy="8" r="2.4" />
      <path d="M11.8 19c0-3 1.9-5 4.2-5s4.2 2 4.2 5" />
    </>
  ),
  // История — свиток с текстом
  scroll: (
    <>
      <path d="M6 5c0-1.1.9-2 2-2h10v13" />
      <path d="M18 16v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2c0-1.1.9-2 2-2h9" />
      <path d="M9 7h6M9 10.5h6" />
    </>
  ),
  // Как добраться — компас со стрелкой
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8z" />
    </>
  ),
  // Частые вопросы — знак вопроса
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.4a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.2-2.7 4" />
      <circle cx="12" cy="17.4" r="0.5" />
    </>
  ),
}

export function MotifIcon({
  name,
  className,
  size = 24,
}: {
  name: MotifName
  className?: string
  size?: number
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
