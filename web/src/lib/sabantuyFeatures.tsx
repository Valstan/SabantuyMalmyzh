import type { MotifName } from '../app/(frontend)/components/MotifIcon'
import type { Locale } from './i18n'

/**
 * Конфиг фича-ряда «Что вас ждёт» на главной. ru + tt (черновик, I11):
 * getFeatures(locale) отдаёт локализованные title/text.
 */
export type Feature = {
  key: string
  icon: MotifName
  title: string
  text: string
  href?: string
  /** Базовый slug фото-обложки 4:3 в web/public/decor/ (`<cover>-{480,768}.jpg`). */
  cover?: string
}

type FeatureDef = {
  key: string
  icon: MotifName
  cover?: string
  ru: { title: string; text: string }
  tt: { title: string; text: string }
}

// `key` — стабильный ключ для overlay редактируемого текста из глобала `home`
// (структура — иконка/обложка — в коде, текст title/text перекрывается из БД).
const FEATURES: FeatureDef[] = [
  {
    key: 'koresh',
    icon: 'koresh',
    cover: 'feat-koresh',
    ru: { title: 'Көрәш', text: 'Борьба на поясах за титул батыра' },
    tt: { title: 'Көрәш', text: 'Батыр исеме өчен билбау көрәше' },
  },
  {
    key: 'horse',
    icon: 'horse',
    cover: 'feat-horse',
    ru: { title: 'Конные скачки', text: 'Удаль и резвость наездников' },
    tt: { title: 'Ат чабышы', text: 'Җайдакларның батырлыгы һәм җитезлеге' },
  },
  {
    key: 'pole',
    icon: 'pole',
    cover: 'feat-pole',
    ru: { title: 'Столб с призом', text: 'Кто доберётся до вершины?' },
    tt: { title: 'Бүләкле багана', text: 'Түбәгә кем менеп җитә?' },
  },
  {
    key: 'cuisine',
    icon: 'cuisine',
    cover: 'feat-cuisine',
    ru: { title: 'Национальная кухня', text: 'Чак-чак, эчпочмак и плов из казана' },
    tt: { title: 'Милли аш', text: 'Чәкчәк, өчпочмак һәм казан пылауы' },
  },
  {
    key: 'concert',
    icon: 'concert',
    cover: 'feat-concert',
    ru: { title: 'Концерт и танцы', text: 'Артисты, песни и народные пляски' },
    tt: { title: 'Концерт һәм биюләр', text: 'Артистлар, җырлар һәм халык биюләре' },
  },
  {
    key: 'kids',
    icon: 'kids',
    cover: 'feat-kids',
    ru: { title: 'Детям', text: 'Игры, аттракционы и сладости' },
    tt: { title: 'Балаларга', text: 'Уеннар, аттракционнар һәм татлылыклар' },
  },
]

export function getFeatures(locale: Locale = 'ru'): Feature[] {
  return FEATURES.map((f) => ({ key: f.key, icon: f.icon, cover: f.cover, ...(locale === 'tt' ? f.tt : f.ru) }))
}
