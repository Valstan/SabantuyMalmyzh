import type { MotifName } from '../app/(frontend)/components/MotifIcon'

/**
 * Конфиг фича-ряда «Что вас ждёт» на главной. ru-строки централизованы здесь
 * (как categories.ts/mapTypes.ts) — точка будущей TT-локализации.
 */
export type Feature = {
  icon: MotifName
  title: string
  text: string
  href?: string
}

export const SABANTUY_FEATURES: Feature[] = [
  { icon: 'koresh', title: 'Көрәш', text: 'Борьба на поясах за титул батыра' },
  { icon: 'horse', title: 'Конные скачки', text: 'Удаль и резвость наездников' },
  { icon: 'pole', title: 'Столб с призом', text: 'Кто доберётся до вершины?' },
  { icon: 'cuisine', title: 'Национальная кухня', text: 'Чак-чак, эчпочмак и плов из казана' },
  { icon: 'concert', title: 'Концерт и танцы', text: 'Артисты, песни и народные пляски' },
  { icon: 'kids', title: 'Детям', text: 'Игры, аттракционы и сладости' },
]
