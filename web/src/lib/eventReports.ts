// Фотоотчёты событий (заявка владельца 2026-07-05): по slug — реальные кадры и
// видео из открытых VK-публикаций о том, что происходило на мероприятии 4 июля 2026.
// Каждое фото атрибутировано автору со ссылкой на исходный пост. Кадры отобраны из
// одобренных кандидатов фотостены; лежат в web/public/events/<slug>/ (rNN + rNN-480).

export type EventReportPhoto = {
  full: string
  thumb: string
  alt: string
  author: string
  post: string
}
export type EventReportVideo = { url: string; title: string }
export type EventReport = {
  lead: { ru: string; tt: string }
  photos: EventReportPhoto[]
  videos?: EventReportVideo[]
}

export const EVENT_REPORTS: Record<string, EventReport> = {
  'p2026-otkrytie': {
    lead: { ru: 'Праздник открыли на главном майдане — с делегациями, караваями и тысячами гостей из четырёх регионов.', tt: 'Бәйрәм төп мәйданда ачылды — делегацияләр, күмәчләр һәм дүрт төбәктән килгән меңләгән кунак белән.' },
    photos: [
      { full: '/events/p2026-otkrytie/r01.jpg', thumb: '/events/p2026-otkrytie/r01-480.jpg', alt: 'Общий вид майдана: сцена и тысячи гостей на открытии', author: 'КИРОВ ЛАЙВ', post: 'https://vk.com/wall-170701363_118126' },
      { full: '/events/p2026-otkrytie/r02.jpg', thumb: '/events/p2026-otkrytie/r02-480.jpg', alt: 'Панорама главной сцены праздника', author: 'Новости Кирово-Чепецка сегодня, происшествия, ЧП', post: 'https://vk.com/wall-228097544_45372' },
      { full: '/events/p2026-otkrytie/r03.jpg', thumb: '/events/p2026-otkrytie/r03-480.jpg', alt: 'Гости и артисты в национальных костюмах', author: 'МАЛМЫЖ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-158787639_77144' },
      { full: '/events/p2026-otkrytie/r04.jpg', thumb: '/events/p2026-otkrytie/r04-480.jpg', alt: 'Официальная делегация с лентой «Сабантуй»', author: 'Образцовый хореографический коллектив "Фантазия"', post: 'https://vk.com/wall-196388971_657' },
      { full: '/events/p2026-otkrytie/r05.jpg', thumb: '/events/p2026-otkrytie/r05-480.jpg', alt: 'Каравай и встреча гостей на открытии', author: 'Городской портал Свойкировский.рф', post: 'https://vk.com/wall-55558610_264728' },
      { full: '/events/p2026-otkrytie/r06.jpg', thumb: '/events/p2026-otkrytie/r06-480.jpg', alt: 'Многолюдное открытие праздника', author: 'Клуб Большая Шабанка', post: 'https://vk.com/wall-197439468_2669' },
    ],
    videos: [
      { url: 'https://vk.com/video-163630299_456245997', title: 'Репортаж: межрегиональный Сабантуй в Калинино' },
    ],
  },
  'p2026-podvorye': {
    lead: { ru: 'Национальные подворья встречали гостей выпечкой и чак-чаком, а в городе мастеров работали гончар и ткачиха.', tt: 'Милли ишегалдылары кунакларны пешкән ризык һәм чәкчәк белән каршы алды, осталар шәһәрендә чүлмәкче һәм тукучы эшләде.' },
    photos: [
      { full: '/events/p2026-podvorye/r01.jpg', thumb: '/events/p2026-podvorye/r01-480.jpg', alt: 'Праздничный стол подворья с выпечкой и чак-чаком', author: 'Татьяна Кузнецова', post: 'https://vk.com/wall498779094_361' },
      { full: '/events/p2026-podvorye/r02.jpg', thumb: '/events/p2026-podvorye/r02-480.jpg', alt: 'Караваи и национальная выпечка на подворье', author: 'Алефтина Трухина', post: 'https://vk.com/wall596331687_297' },
      { full: '/events/p2026-podvorye/r03.jpg', thumb: '/events/p2026-podvorye/r03-480.jpg', alt: 'Хозяйка подворья у стола с угощениями', author: 'Обо всем | Малмыж', post: 'https://vk.com/wall-89083141_487026' },
      { full: '/events/p2026-podvorye/r04.jpg', thumb: '/events/p2026-podvorye/r04-480.jpg', alt: 'Чак-чак и мёд — сладости подворья', author: 'Наталья Хайруллина', post: 'https://vk.com/wall382982136_5230' },
      { full: '/events/p2026-podvorye/r05.jpg', thumb: '/events/p2026-podvorye/r05-480.jpg', alt: 'Выпечка хлеба в печи на подворье', author: 'Жанна С', post: 'https://vk.com/wall837394679_315' },
      { full: '/events/p2026-podvorye/r06.jpg', thumb: '/events/p2026-podvorye/r06-480.jpg', alt: 'Мастер за гончарным кругом в городе мастеров', author: 'Елена Соколова', post: 'https://vk.com/wall37324637_5903' },
      { full: '/events/p2026-podvorye/r07.jpg', thumb: '/events/p2026-podvorye/r07-480.jpg', alt: 'Ткачиха за старинным станком', author: 'КИРОВ ЛАЙВ', post: 'https://vk.com/wall-170701363_118126' },
      { full: '/events/p2026-podvorye/r08.jpg', thumb: '/events/p2026-podvorye/r08-480.jpg', alt: 'Колодец и утварь в убранстве подворья', author: 'Алефтина Трухина', post: 'https://vk.com/wall596331687_297' },
      { full: '/events/p2026-podvorye/r09.jpg', thumb: '/events/p2026-podvorye/r09-480.jpg', alt: 'Живой уголок подворья', author: 'Жанна С', post: 'https://vk.com/wall837394679_315' },
      { full: '/events/p2026-podvorye/r10.jpg', thumb: '/events/p2026-podvorye/r10-480.jpg', alt: 'Лошадь с телегой и корова на подворье', author: 'Наталья Хайруллина', post: 'https://vk.com/wall382982136_5230' },
      { full: '/events/p2026-podvorye/r11.jpg', thumb: '/events/p2026-podvorye/r11-480.jpg', alt: 'Украшенная праздничная повозка', author: 'Первый Малмыжский', post: 'https://vk.com/wall-86517261_133381' },
      { full: '/events/p2026-podvorye/r12.jpg', thumb: '/events/p2026-podvorye/r12-480.jpg', alt: 'Хозяйка подворья с угощением', author: 'Алефтина Трухина', post: 'https://vk.com/wall596331687_297' },
    ],
  },
  'p2026-kollektivy': {
    lead: { ru: 'Творческие коллективы выступали в национальных костюмах — танцы и песни звучали весь день.', tt: 'Иҗат коллективлары милли киемнәрдә чыгыш ясады — көне буе биюләр һәм җырлар яңгырады.' },
    photos: [
      { full: '/events/p2026-kollektivy/r01.jpg', thumb: '/events/p2026-kollektivy/r01-480.jpg', alt: 'Танцовщица в ярком национальном костюме', author: 'Елена Соколова', post: 'https://vk.com/wall37324637_5903' },
      { full: '/events/p2026-kollektivy/r02.jpg', thumb: '/events/p2026-kollektivy/r02-480.jpg', alt: 'Ансамбль в зелёных платьях', author: 'Елена Соколова', post: 'https://vk.com/wall37324637_5903' },
      { full: '/events/p2026-kollektivy/r03.jpg', thumb: '/events/p2026-kollektivy/r03-480.jpg', alt: 'Артисты в костюмах у избы', author: 'МАЛМЫЖ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-158787639_77144' },
      { full: '/events/p2026-kollektivy/r04.jpg', thumb: '/events/p2026-kollektivy/r04-480.jpg', alt: 'Творческий коллектив на площадке праздника', author: 'Образцовый хореографический коллектив "Фантазия"', post: 'https://vk.com/wall-196388971_657' },
      { full: '/events/p2026-kollektivy/r05.jpg', thumb: '/events/p2026-kollektivy/r05-480.jpg', alt: 'Ансамбль в красно-белых костюмах', author: 'Светлана Русских', post: 'https://vk.com/wall479828915_1699' },
      { full: '/events/p2026-kollektivy/r06.jpg', thumb: '/events/p2026-kollektivy/r06-480.jpg', alt: 'Участницы коллектива в национальных нарядах', author: 'Альфия Асхадуллина', post: 'https://vk.com/wall306069757_788' },
      { full: '/events/p2026-kollektivy/r07.jpg', thumb: '/events/p2026-kollektivy/r07-480.jpg', alt: 'Танец в национальном костюме', author: 'МАЛМЫЖ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-158787639_77149' },
      { full: '/events/p2026-kollektivy/r08.jpg', thumb: '/events/p2026-kollektivy/r08-480.jpg', alt: 'Обмен караваями и приветствие гостей', author: 'КИРОВ 24/7', post: 'https://vk.com/wall-48533011_285430' },
      { full: '/events/p2026-kollektivy/r09.jpg', thumb: '/events/p2026-kollektivy/r09-480.jpg', alt: 'Артистки в костюмах приветствуют гостей', author: 'КИРОВЧАНО', post: 'https://vk.com/wall-208685575_101257' },
    ],
  },
  'p2026-koncert-cks': {
    lead: { ru: 'Большая концертная программа на главной сцене собрала артистов и зрителей.', tt: 'Төп сәхнәдәге зур концерт программасы артистларны һәм тамашачыларны җыйды.' },
    photos: [
      { full: '/events/p2026-koncert-cks/r01.jpg', thumb: '/events/p2026-koncert-cks/r01-480.jpg', alt: 'Массовый концерт на главной сцене', author: 'Малмыжское РМО ВПП «Единая Россия»', post: 'https://vk.com/wall-212362843_1924' },
      { full: '/events/p2026-koncert-cks/r02.jpg', thumb: '/events/p2026-koncert-cks/r02-480.jpg', alt: 'Народные танцы на сцене', author: 'МАЛМЫЖ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-158787639_77127' },
      { full: '/events/p2026-koncert-cks/r03.jpg', thumb: '/events/p2026-koncert-cks/r03-480.jpg', alt: 'Концертная программа на сцене', author: 'ЦКиД пгт. Афанасьево', post: 'https://vk.com/wall-38327189_8841' },
      { full: '/events/p2026-koncert-cks/r04.jpg', thumb: '/events/p2026-koncert-cks/r04-480.jpg', alt: 'Танцевальный коллектив на сцене', author: 'Новости Кирова сегодня, происшествия, срочно', post: 'https://vk.com/wall-227015849_38842' },
      { full: '/events/p2026-koncert-cks/r05.jpg', thumb: '/events/p2026-koncert-cks/r05-480.jpg', alt: 'Главная сцена и зрители', author: 'Жанна С', post: 'https://vk.com/wall837394679_315' },
      { full: '/events/p2026-koncert-cks/r06.jpg', thumb: '/events/p2026-koncert-cks/r06-480.jpg', alt: 'Артисты на сцене', author: 'МАЛМЫЖ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-158787639_77155' },
      { full: '/events/p2026-koncert-cks/r07.jpg', thumb: '/events/p2026-koncert-cks/r07-480.jpg', alt: 'Концерт и зрители у сцены', author: 'События Кировской области', post: 'https://vk.com/wall-219571591_20115' },
    ],
    videos: [
      { url: 'https://vk.com/video-48533011_456243295', title: 'Атмосфера праздника (КИРОВ 24/7)' },
    ],
  },
  'p2026-detskiy-sabantuy': {
    lead: { ru: 'Детский Сабантуй — юные артисты на сцене и семьи в праздничных нарядах.', tt: 'Балалар Сабантуе — сәхнәдә яшь артистлар һәм бәйрәм киемендәге гаиләләр.' },
    photos: [
      { full: '/events/p2026-detskiy-sabantuy/r01.jpg', thumb: '/events/p2026-detskiy-sabantuy/r01-480.jpg', alt: 'Детский ансамбль в национальных костюмах', author: 'Обо всем | Малмыж', post: 'https://vk.com/wall-89083141_487035' },
      { full: '/events/p2026-detskiy-sabantuy/r02.jpg', thumb: '/events/p2026-detskiy-sabantuy/r02-480.jpg', alt: 'Дети-артисты на сцене', author: 'Обо всем | Малмыж', post: 'https://vk.com/wall-89083141_487035' },
      { full: '/events/p2026-detskiy-sabantuy/r03.jpg', thumb: '/events/p2026-detskiy-sabantuy/r03-480.jpg', alt: 'Дети в костюмах на празднике', author: 'Жанна С', post: 'https://vk.com/wall837394679_315' },
      { full: '/events/p2026-detskiy-sabantuy/r04.jpg', thumb: '/events/p2026-detskiy-sabantuy/r04-480.jpg', alt: 'Семья с детьми в праздничных нарядах', author: 'Образцовый хореографический коллектив "Фантазия"', post: 'https://vk.com/wall-196388971_657' },
    ],
  },
  'p2026-sostyazaniya': {
    lead: { ru: 'На майдане прошли национальная борьба корэш и гиревые состязания — при полном круге болельщиков.', tt: 'Мәйданда милли көрәш һәм гер күтәрү ярышлары узды — тулы җанатарлар боҗрасында.' },
    photos: [
      { full: '/events/p2026-sostyazaniya/r01.jpg', thumb: '/events/p2026-sostyazaniya/r01-480.jpg', alt: 'Национальная борьба корэш на майдане', author: 'КИРОВСКАЯ ОБЛАСТЬ - ИНФО | Информационная сеть', post: 'https://vk.com/wall-168170001_4267' },
      { full: '/events/p2026-sostyazaniya/r02.jpg', thumb: '/events/p2026-sostyazaniya/r02-480.jpg', alt: 'Приём в борьбе корэш', author: 'БАЛТАСИ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-179203620_23517' },
      { full: '/events/p2026-sostyazaniya/r03.jpg', thumb: '/events/p2026-sostyazaniya/r03-480.jpg', alt: 'Силач на гиревом состязании', author: 'КИРОВСКАЯ ОБЛАСТЬ - ИНФО | Информационная сеть', post: 'https://vk.com/wall-168170001_4267' },
      { full: '/events/p2026-sostyazaniya/r04.jpg', thumb: '/events/p2026-sostyazaniya/r04-480.jpg', alt: 'Круг болельщиков вокруг ковра корэш', author: 'Староирюкское сельское поселение', post: 'https://vk.com/wall-207543751_1641' },
    ],
  },
  'p2026-skazka-tukay': {
    lead: { ru: 'Сказку по мотивам произведений Габдуллы Тукая представили юные участники.', tt: 'Габдулла Тукай әсәрләре буенча әкиятне яшь катнашучылар күрсәтте.' },
    photos: [
      { full: '/events/p2026-skazka-tukay/r01.jpg', thumb: '/events/p2026-skazka-tukay/r01-480.jpg', alt: 'Рисунок по мотивам сказок Габдуллы Тукая', author: 'МКОУ СОШ имени генерал – лейтенанта В.Г. Асапова', post: 'https://vk.com/wall-217735862_1247' },
    ],
  },
}
