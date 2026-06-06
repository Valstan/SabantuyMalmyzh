import type { MotifName } from '../app/(frontend)/components/MotifIcon'

/**
 * Конфиг секции-хаба «Традиции и культура» на главной + единый источник
 * ссылок на культурные разделы (используется и в подвале). ru-строки
 * централизованы здесь (как sabantuyFeatures.ts / categories.ts) — точка
 * будущей TT-локализации. Страницы создаёт сид src/seed/seedCulture.ts.
 */
export type CultureSection = {
  icon: MotifName
  title: string
  text: string
  href: string
}

export const CULTURE_SECTIONS: CultureSection[] = [
  {
    icon: 'peoples',
    title: 'Народы края',
    text: 'Русские, татары, марийцы и удмурты — праздник дружбы народов',
    href: '/narody',
  },
  {
    icon: 'house',
    title: 'Подворья',
    text: 'Национальные дворы народов края и ярмарка ремёсел',
    href: '/podvorya',
  },
  {
    icon: 'scroll',
    title: 'История Сабантуя',
    text: 'От древнего праздника плуга к народному торжеству',
    href: '/istoriya-sabantuya',
  },
  {
    icon: 'koresh',
    title: 'Майдан',
    text: 'Куреш, скачки, столб с призом и весёлые состязания',
    href: '/maydan',
  },
  {
    icon: 'kids',
    title: 'Детский майдан',
    text: 'Игры, мастер-классы и сладости для ребят',
    href: '/detskiy-maydan',
  },
  {
    icon: 'cuisine',
    title: 'Кухня',
    text: 'Чак-чак, эчпочмак, плов из казана и общий стол народов',
    href: '/kuhnya',
  },
  {
    icon: 'compass',
    title: 'Как добраться',
    text: 'Дорога до Малмыжа на машине и автобусом',
    href: '/kak-dobratsya',
  },
  {
    icon: 'question',
    title: 'Частые вопросы',
    text: 'Вход, дети, что взять с собой и где припарковаться',
    href: '/faq',
  },
]
