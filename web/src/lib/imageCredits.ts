// Реестр внешних (Wikimedia Commons) фотографий сайта — единственный источник
// правды об авторах/лицензиях. Рендерится страницей «Источники фотографий»
// (/istochniki-foto): атрибуция собрана в одном месте, а не под каждой
// миниатюрой (для CC-лицензий это допустимый способ — «reasonable to the
// means and context»). Наши AI-иллюстрации (design/accepted) в реестр не
// входят — они созданы для сайта и атрибуции не требуют.
//
// Файлы деривативов: web/public/decor/<slug>-{480,768}.jpg (кроп 4:3 + сжатие,
// scripts/process-commons-covers.mjs). Для CC BY-SA кроп распространяется под
// той же лицензией.
export type ImageCredit = {
  /** Базовый slug файла в /decor (без -480/-768) */
  slug: string
  /** Название файла на Викискладе */
  title: string
  /** Автор (как указан на странице файла) */
  author: string
  /** Короткое имя лицензии */
  license: string
  /** Ссылка на текст лицензии (null — PD/CC0, разрешение не требуется) */
  licenseUrl: string | null
  /** Страница файла на Викискладе */
  sourceUrl: string
  /** Где используется (ru/tt) */
  usage: { ru: string; tt: string }
}

export const IMAGE_CREDITS: ImageCredit[] = [
  {
    slug: 'feat-volleyball',
    title: 'Beach volleyball ball',
    author: 'Thue',
    license: 'Public domain',
    licenseUrl: null,
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Beach_volleyball_ball.jpg',
    usage: { ru: 'Программа: волейбольный турнир', tt: 'Программа: волейбол турниры' },
  },
  {
    slug: 'feat-football',
    title: 'Adidas soccer ball on a grass pitch (Unsplash)',
    author: 'Peter Glaser',
    license: 'CC0 1.0',
    licenseUrl: null,
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Adidas_soccer_ball_on_a_grass_pitch_(Unsplash).jpg',
    usage: { ru: 'Программа: турниры по футболу и мини-футболу', tt: 'Программа: футбол һәм мини-футбол турнирлары' },
  },
  {
    slug: 'feat-gift',
    title: 'Brown gift box with red ribbon and bow',
    author: 'Shixart1985',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Brown_gift_box_with_red_ribbon_and_bow.jpg',
    usage: { ru: 'Программа: розыгрыш подарков', tt: 'Программа: бүләкләр уйнату' },
  },
  {
    slug: 'feat-mosque',
    title: 'Qol Sharif Mosque',
    author: 'Abdullatif Alsharif',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Qol_Sharif_Mosque.jpg',
    usage: { ru: 'Программа: дуа (молитва)', tt: 'Программа: дога' },
  },
]
