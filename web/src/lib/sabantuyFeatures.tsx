import type { MotifName } from '../app/(frontend)/components/MotifIcon'
import type { Locale } from './i18n'

/**
 * Конфиг фича-ряда «Что вас ждёт» на главной. ru + tt (черновик, I11):
 * getFeatures(locale) отдаёт локализованные title/text.
 */
export type Feature = {
  icon: MotifName
  title: string
  text: string
  href?: string
}

type FeatureDef = {
  icon: MotifName
  ru: { title: string; text: string }
  tt: { title: string; text: string }
}

const FEATURES: FeatureDef[] = [
  {
    icon: 'koresh',
    ru: { title: 'Көрәш', text: 'Борьба на поясах за титул батыра' },
    tt: { title: 'Көрәш', text: 'Батыр исеме өчен билбау көрәше' },
  },
  {
    icon: 'horse',
    ru: { title: 'Конные скачки', text: 'Удаль и резвость наездников' },
    tt: { title: 'Ат чабышы', text: 'Җайдакларның батырлыгы һәм җитезлеге' },
  },
  {
    icon: 'pole',
    ru: { title: 'Столб с призом', text: 'Кто доберётся до вершины?' },
    tt: { title: 'Бүләкле багана', text: 'Түбәгә кем менеп җитә?' },
  },
  {
    icon: 'cuisine',
    ru: { title: 'Национальная кухня', text: 'Чак-чак, эчпочмак и плов из казана' },
    tt: { title: 'Милли аш', text: 'Чәкчәк, өчпочмак һәм казан пылауы' },
  },
  {
    icon: 'concert',
    ru: { title: 'Концерт и танцы', text: 'Артисты, песни и народные пляски' },
    tt: { title: 'Концерт һәм биюләр', text: 'Артистлар, җырлар һәм халык биюләре' },
  },
  {
    icon: 'kids',
    ru: { title: 'Детям', text: 'Игры, аттракционы и сладости' },
    tt: { title: 'Балаларга', text: 'Уеннар, аттракционнар һәм татлылыклар' },
  },
]

export function getFeatures(locale: Locale = 'ru'): Feature[] {
  return FEATURES.map((f) => ({ icon: f.icon, ...(locale === 'tt' ? f.tt : f.ru) }))
}

export const SABANTUY_FEATURES: Feature[] = getFeatures('ru')
