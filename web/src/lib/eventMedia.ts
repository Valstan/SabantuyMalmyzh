// Кодовые медиа страниц событий (slug → шапка + фотогалерея) — для событий
// программы, у которых нет heroImage в БД. Файлы: web/public/events/<dir>/
// (конвейер scripts/process-avstralia.mjs). heroImage из /admin, если задан,
// имеет приоритет (см. EventView).
// Фото «АВСТРАЛИИ» переданы владельцем от группы — внешняя атрибуция не нужна.
export type EventGalleryPhoto = {
  /** Полный кадр (открывается по клику) */
  full: string
  /** Миниатюра для сетки (480, 4:3) */
  thumb: string
  alt: string
}

export type EventMedia = {
  // width/height нужны OG-разметке (eventMeta): ВК публикует сниппет первого
  // скрейпа раньше, чем докачал картинку — без явных размеров первый шаринг
  // уходит без фото (та же грабля, что у новостей, PR #246).
  hero?: { src: string; alt: string; width: number; height: number }
  gallery?: EventGalleryPhoto[]
}

const AVSTRALIA_DIR = '/events/avstralia'
const avstraliaPhoto = (n: number, alt: string): EventGalleryPhoto => ({
  full: `${AVSTRALIA_DIR}/photo-0${n}.jpg`,
  thumb: `${AVSTRALIA_DIR}/photo-0${n}-480.jpg`,
  alt,
})

export const EVENT_MEDIA: Record<string, EventMedia> = {
  'p2026-koncert-avstraliya': {
    hero: { src: `${AVSTRALIA_DIR}/hero.jpg`, alt: 'Кавер-группа «АВСТРАЛИЯ» на сцене', width: 1600, height: 900 },
    gallery: [
      avstraliaPhoto(1, 'Группа «АВСТРАЛИЯ»: фотосессия с ретро-телевизорами'),
      avstraliaPhoto(2, '«АВСТРАЛИЯ»: вокалистка, гитарист и барабанщик'),
      avstraliaPhoto(3, '«АВСТРАЛИЯ» на клубной сцене'),
      avstraliaPhoto(4, 'Вокалистка «АВСТРАЛИИ» у микрофона'),
      avstraliaPhoto(5, 'Вокалистка «АВСТРАЛИИ» на концерте'),
      avstraliaPhoto(6, 'Барабанщик «АВСТРАЛИИ»'),
      avstraliaPhoto(7, 'Гитарист «АВСТРАЛИИ» с Fender Stratocaster'),
    ],
  },
}
