import type { MotifName } from '../app/(frontend)/components/MotifIcon'
import type { Locale } from './i18n'

/**
 * Конфиг секции-хаба «Традиции и культура» на главной + единый источник ссылок на
 * культурные разделы (используется и в подвале). ru + tt (черновик, I11):
 * getCultureSections(locale) отдаёт локализованные title/text. Страницы создаёт сид
 * src/seed/seedCulture.ts (ru) / seedTatar.ts (tt).
 */
export type CultureSection = {
  key: string
  icon: MotifName
  title: string
  text: string
  href: string
  /** Базовый slug обложки в web/public/decor/ (4:3, `<cover>-{480,768}.jpg`); нет → градиент-иконка. */
  cover?: string
}

type CultureDef = {
  key: string
  icon: MotifName
  href: string
  cover?: string
  ru: { title: string; text: string }
  tt: { title: string; text: string }
}

// `key` — стабильный ключ для overlay редактируемого текста из глобала `home`
// (иконка/href/обложка — в коде, текст title/text перекрывается из БД по ключу).
const SECTIONS: CultureDef[] = [
  {
    key: 'narody',
    icon: 'peoples',
    href: '/narody',
    cover: 'card-narody',
    ru: { title: 'Народы края', text: 'Русские, татары, марийцы и удмурты — праздник дружбы народов' },
    tt: { title: 'Төбәк халыклары', text: 'Руслар, татарлар, марилар һәм удмуртлар — халыклар дуслыгы бәйрәме' },
  },
  {
    key: 'podvorya',
    icon: 'house',
    href: '/podvorya',
    cover: 'card-podvorya',
    ru: { title: 'Подворья', text: 'Национальные дворы народов края и ярмарка ремёсел' },
    tt: { title: 'Милли йортлар', text: 'Төбәк халыкларының милли йортлары һәм һөнәрләр ярминкәсе' },
  },
  {
    key: 'istoriya',
    icon: 'scroll',
    href: '/istoriya-sabantuya',
    cover: 'card-istoriya',
    ru: { title: 'История Сабантуя', text: 'От древнего праздника плуга к народному торжеству' },
    tt: { title: 'Сабантуй тарихы', text: 'Борынгы сабан бәйрәменнән халык тантанасына' },
  },
  {
    key: 'maydan',
    icon: 'koresh',
    href: '/maydan',
    cover: 'card-maydan',
    ru: { title: 'Майдан', text: 'Куреш, скачки, столб с призом и весёлые состязания' },
    tt: { title: 'Мәйдан', text: 'Көрәш, ат чабышы, бүләкле багана һәм күңелле ярышлар' },
  },
  {
    key: 'detskiy',
    icon: 'kids',
    href: '/detskiy-maydan',
    cover: 'card-detskiy',
    ru: { title: 'Детский майдан', text: 'Игры, мастер-классы и сладости для ребят' },
    tt: { title: 'Балалар мәйданы', text: 'Балалар өчен уеннар, мастер-класслар һәм татлылыклар' },
  },
  {
    key: 'kuhnya',
    icon: 'cuisine',
    href: '/kuhnya',
    cover: 'card-kuhnya',
    ru: { title: 'Кухня', text: 'Чак-чак, эчпочмак, плов из казана и общий стол народов' },
    tt: { title: 'Ашлар', text: 'Чәкчәк, өчпочмак, казан пылауы һәм халыкларның уртак табыны' },
  },
  {
    key: 'doroga',
    icon: 'compass',
    href: '/kak-dobratsya',
    cover: 'card-doroga',
    ru: { title: 'Как добраться', text: 'Дорога до Малмыжа на машине и автобусом' },
    tt: { title: 'Ничек килергә', text: 'Малмыжга машинада һәм автобуста юл' },
  },
  {
    key: 'faq',
    icon: 'question',
    href: '/faq',
    ru: { title: 'Частые вопросы', text: 'Вход, дети, что взять с собой и где припарковаться' },
    tt: { title: 'Еш сораулар', text: 'Керү, балалар, үзең белән нәрсә алырга һәм кайда туктарга' },
  },
]

export function getCultureSections(locale: Locale = 'ru'): CultureSection[] {
  return SECTIONS.map((s) => ({ key: s.key, icon: s.icon, href: s.href, cover: s.cover, ...(locale === 'tt' ? s.tt : s.ru) }))
}
