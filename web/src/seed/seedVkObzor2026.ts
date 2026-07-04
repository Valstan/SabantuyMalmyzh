/**
 * Пост-обзор «Сабантуй-2026: как это было» — по материалам ВКонтакте за 4 июля 2026.
 *
 *   corepack pnpm -C web payload run src/seed/seedVkObzor2026.ts
 *
 * Разведка соцсети сделана через VK API (шлюз проекта SARAFAN, 2026-07-04):
 * 33 публикации за день; факты и фото — из открытых постов, каждое фото
 * атрибутировано автору со ссылкой на исходный пост (раздел «Источники»).
 * Фото лежат в web/src/seed/assets/vk-obzor-2026/ (1600px), грузятся в Media
 * по filePath (на проде — MEDIA_DIR); видео не заливаются — поле `videos`
 * со ссылками на VK-ролики (штатный плеер lib/videoEmbed).
 *
 * Идемпотентно: пост по slug есть → ru-тело не трогается, SEED_FORCE=1
 * перезаписывает осознанно; фото ищутся в Media по filename без дублей.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- seed-утилита: Payload data untyped */
import config from '@payload-config'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const log = (m: string) => console.log(m)

// ─── Lexical-конструктор (как в seedNews/seedPrepPosts) ──────────────────────
type LexNode = Record<string, unknown>

function inline(text: string): LexNode[] {
  const out: LexNode[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  const push = (t: string, bold: boolean) => {
    if (!t) return
    out.push({ type: 'text', text: t, version: 1, format: bold ? 1 : 0, style: '', mode: 'normal', detail: 0 })
  }
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index), false)
    push(m[1], true)
    last = m.index + m[0].length
  }
  push(text.slice(last), false)
  return out
}
const block = (type: string, extra: LexNode, children: LexNode[]): LexNode => ({
  type,
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  ...extra,
  children,
})
const p = (text: string): LexNode => block('paragraph', { textFormat: 0, textStyle: '' }, inline(text))
const h2 = (text: string): LexNode => block('heading', { tag: 'h2' }, inline(text))
const link = (text: string, url: string): LexNode =>
  block('link', { fields: { linkType: 'custom', newTab: true, url }, version: 2 }, inline(text))
const pNodes = (...children: LexNode[]): LexNode =>
  block('paragraph', { textFormat: 0, textStyle: '' }, children)
const li = (children: LexNode[], value: number): LexNode => block('listitem', { value }, children)
const ulNodes = (items: LexNode[][]): LexNode =>
  block('list', { listType: 'bullet', start: 1, tag: 'ul' }, items.map((ch, i) => li(ch, i + 1)))
const doc = (...children: LexNode[]): unknown => ({
  root: { type: 'root', version: 1, format: '', indent: 0, direction: 'ltr', children },
})
// Upload-узел (картинка из Media в теле) — формат on-site редактора, version 3.
const up = (mediaId: number | string): LexNode => ({
  type: 'upload',
  version: 3,
  relationTo: 'media',
  value: mediaId,
  id: `seed-up-${mediaId}`,
  fields: {},
  format: '',
})

// ─── Фото: файл → alt + источник (автор и VK-пост) ───────────────────────────
type Photo = { file: string; alt: string; author: string; post: string }
const PHOTOS: Photo[] = [
  { file: 'vkobzor-arka.jpg', alt: 'Праздничная арка «Сабантуй» на въезде на майдан в Калинино', author: 'Елена Соколова', post: 'https://vk.com/wall37324637_5903' },
  { file: 'vkobzor-hleb-sol.jpg', alt: 'Гостей праздника встречают хлебом-солью', author: 'Подслушано Малмыж', post: 'https://vk.com/wall-160597747_40581' },
  { file: 'vkobzor-gubernator.jpg', alt: 'Губернатор Александр Соколов с полотенцем «Сабантуй» среди гостей праздника', author: 'страница Александра Соколова', post: 'https://vk.com/wall734734006_63473' },
  { file: 'vkobzor-chak-chak.jpg', alt: 'Угощение чак-чаком на майдане', author: 'страница Александра Соколова', post: 'https://vk.com/wall734734006_63473' },
  { file: 'vkobzor-kostyumy.jpg', alt: 'Участники праздника в национальных костюмах народов Вятского края', author: 'Елена Соколова', post: 'https://vk.com/wall37324637_5903' },
  { file: 'vkobzor-tancy.jpg', alt: 'Народные танцы на майдане Сабантуя', author: 'Елена Соколова', post: 'https://vk.com/wall37324637_5903' },
  { file: 'vkobzor-scena.jpg', alt: 'Выступление на главной сцене праздника', author: 'Управление образования Малмыжского района', post: 'https://vk.com/wall-217757043_6466' },
  { file: 'vkobzor-nac-derevnya.jpg', alt: 'Вход в «Национальную деревню» — подворья народов', author: 'Наталья Хайруллина', post: 'https://vk.com/wall382982136_5230' },
  { file: 'vkobzor-art-chak-chak.jpg', alt: 'Арт-объект «Чак-чак» на площадке праздника', author: 'Наталья Хайруллина', post: 'https://vk.com/wall382982136_5230' },
  { file: 'vkobzor-kuhnya.jpg', alt: 'Печи национальной кухни на подворьях', author: 'Мария Малмыж', post: 'https://vk.com/wall236493929_18962' },
  { file: 'vkobzor-kon.jpg', alt: 'Конь на подворье — конные забеги и скачки шли весь день', author: 'Жанна С.', post: 'https://vk.com/wall837394679_315' },
  { file: 'vkobzor-deti.jpg', alt: 'Детская площадка: мастер-классы и поделки', author: 'школа им. генерал-лейтенанта В. Г. Асапова', post: 'https://vk.com/wall-217735862_1247' },
]
const COVER_FILE = 'vkobzor-arka.jpg'

// ─── Видео (ссылки на VK-ролики, не заливаются) ──────────────────────────────
const VIDEOS = [
  { url: 'https://vk.com/video-163630299_456245997', title: 'Репортаж: межрегиональный Сабантуй в Калинино (Правительство Кировской области)' },
  { url: 'https://vk.com/video-163630299_456246000', title: 'Итоги поездки губернатора в Малмыжский район (Правительство Кировской области)' },
  { url: 'https://vk.com/video-48533011_456243295', title: 'Атмосфера праздника (КИРОВ 24/7)' },
]

const SLUG = 'sabantuy-2026-kak-eto-bylo'
const TITLE_RU = 'Сабантуй-2026: как это было — 20 тысяч гостей, скачки, корэш и песни до вечера'
const EXCERPT_RU =
  'Межрегиональный Сабантуй в Калинино собрал около 20 тысяч гостей из четырёх регионов. ' +
  'Шествие, национальные подворья, борьба корэш, конные скачки, школьные фотозоны и концерты — ' +
  'собрали обзор дня по горячим публикациям ВКонтакте: фото, видео и самые тёплые слова о празднике.'

const bodyRu = (m: Record<string, number | string>) =>
  doc(
    p('Сегодня малмыжская земля приняла один из самых ярких праздников года — **межрегиональный Сабантуй-2026**. По данным правительства Кировской области, на майдан у села Калинино приехали **около 20 тысяч гостей из четырёх регионов России** — праздник стал одним из главных событий Года единства народов России и 90-летия Кировской области.'),
    up(m[COVER_FILE]),
    h2('Праздник дружбы'),
    p('День начался с торжественного шествия и продолжился на десятках площадок: **национальные подворья** с бытом, ремёслами и кухней, ярмарка мастеров, **борьба корэш**, конные забеги и скачки, волейбол и футбол, детский Сабантуй. Участников приветствовал губернатор Кировской области **Александр Соколов** — он отметил, что Сабантуй проходит в самом многонациональном районе области, где издавна бок о бок живут русские, татары, марийцы, удмурты.'),
    up(m['vkobzor-hleb-sol.jpg']),
    up(m['vkobzor-gubernator.jpg']),
    p('Гостей по традиции встречали хлебом-солью и чак-чаком, а на сцене весь день выступали творческие коллективы Малмыжского и Балтасинского районов, артисты Татарстана и Башкортостана.'),
    up(m['vkobzor-chak-chak.jpg']),
    up(m['vkobzor-kostyumy.jpg']),
    up(m['vkobzor-tancy.jpg']),
    up(m['vkobzor-scena.jpg']),
    h2('Подворья, кони и мастера'),
    p('«Национальная деревня» стала сердцем праздника: печи с национальной кухней, живность на подворьях, арт-объекты — гигантский чак-чак у входа фотографировали, кажется, все.'),
    up(m['vkobzor-nac-derevnya.jpg']),
    up(m['vkobzor-art-chak-chak.jpg']),
    up(m['vkobzor-kuhnya.jpg']),
    up(m['vkobzor-kon.jpg']),
    h2('Школы и дети'),
    p('Малмыжские школы сделали праздник ярче: красочные фотозоны, мастер-классы, выступления юных артистов на детской площадке — песни звучали на русском и татарском языках. Самой творческой семьёй Сабантуя стала **семья Поповых** с мастер-классом «Мечты сбываются».'),
    up(m['vkobzor-deti.jpg']),
    p('Вечером праздник продолжился: в 19:30 — розыгрыш подарков, а в 21:00 на майдане — **концерт кавер-группы «АВСТРАЛИЯ»** из Казани.'),
    h2('Что пишут земляки'),
    ulNodes([
      inline('«Душевные песни и танцы, интересная борьба, разносольное подворье, прекрасная погода и множество гостей нашего города» — **Мария**'),
      inline('«Яркие краски Малмыжского Сабантуя стали ещё ярче от творчества лицеистов, педагогов и родителей» — **Малмыжский лицей**'),
      inline('«Этот древний праздник, словно песня ветра, прокатился по нашей земле, принеся с собой дух единства, веселья и народных традиций» — **школа им. В. Г. Асапова**'),
    ]),
    p('Делитесь своими кадрами в **«Народной ленте»** нашего сайта — лучшие попадут в Фотобитву и месячный рейтинг!'),
    h2('Источники фото и видео'),
    p('Обзор составлен по открытым публикациям ВКонтакте от 4 июля 2026 года. Авторы фотографий:'),
    ulNodes(
      Array.from(
        PHOTOS.reduce((acc, ph) => {
          if (!acc.has(ph.post)) acc.set(ph.post, ph.author)
          return acc
        }, new Map<string, string>()),
      ).map(([post, author]) => [...inline(`${author} — `), link('пост ВКонтакте', post)]),
    ),
    pNodes(
      ...inline('Видео: пресс-служба Правительства Кировской области ('),
      link('vk.com/kirovreg', 'https://vk.com/kirovreg'),
      ...inline('), сообщество «КИРОВ 24/7». Права на материалы принадлежат их авторам; фото приведены с указанием источника. Если вы автор и хотите, чтобы материал убрали или подписали иначе — напишите нам через форму на сайте.'),
    ),
  )

// ─── Татарский черновик (вычитка носителем — PENDING) ────────────────────────
const TITLE_TT = 'Сабантуй-2026: ничек узды — 20 мең кунак, ат чабышлары, көрәш һәм кичкә кадәр җырлар'
const EXCERPT_TT =
  'Калинино авылы янындагы мәйданга дүрт төбәктән 20 мең чамасы кунак җыелды. Тантаналы йөреш, милли ихаталар, ' +
  'көрәш, ат чабышлары, мәктәп фотозоналары һәм концертлар — бәйрәм көненең күзәтүе: фото, видео һәм иң җылы сүзләр.'
const bodyTt = (m: Record<string, number | string>) =>
  doc(
    p('Бүген Малмыж җире елның иң якты бәйрәмнәренең берсен кабул итте — **төбәкара Сабантуй-2026**. Киров өлкәсе хөкүмәте мәгълүматлары буенча, Калинино авылы янындагы мәйданга **Россиянең дүрт төбәгеннән 20 мең чамасы кунак** килде.'),
    up(m[COVER_FILE]),
    h2('Дуслык бәйрәме'),
    p('Көн тантаналы йөрештән башланды: **милли ихаталар**, осталар ярминкәсе, **көрәш**, ат йөгерешләре һәм чабышлары, волейбол һәм футбол, балалар Сабантуе. Катнашучыларны Киров өлкәсе губернаторы **Александр Соколов** сәламләде.'),
    up(m['vkobzor-hleb-sol.jpg']),
    up(m['vkobzor-kostyumy.jpg']),
    up(m['vkobzor-tancy.jpg']),
    h2('Ихаталар, атлар һәм осталар'),
    p('«Милли авыл» бәйрәмнең йөрәге булды: милли ашлар пешерүче мичләр, ихаталардагы хайваннар, арт-объектлар — керү янындагы гигант чак-чакны, мөгаен, барысы да фотога төшерде.'),
    up(m['vkobzor-nac-derevnya.jpg']),
    up(m['vkobzor-art-chak-chak.jpg']),
    up(m['vkobzor-kon.jpg']),
    h2('Мәктәпләр һәм балалар'),
    p('Малмыж мәктәпләре бәйрәмне тагын да яктырак итте: фотозоналар, осталык дәресләре, яшь артистлар чыгышлары — җырлар рус һәм татар телләрендә яңгырады.'),
    up(m['vkobzor-deti.jpg']),
    p('Кичен бәйрәм дәвам итте: 19:30да — бүләкләр уйнатуы, 21:00дә мәйданда — Казанның **«АВСТРАЛИЯ» кавер-төркеме концерты**.'),
    p('Үз кадрларыгыз белән сайтыбызның **«Халык лентасында»** уртаклашыгыз!'),
  )

// ─── Run ──────────────────────────────────────────────────────────────────────
const payload = await getPayload({ config })
const force = process.env.SEED_FORCE === '1'

// 1. Фото → Media (по filename, без дублей).
const mediaIds: Record<string, number | string> = {}
for (const ph of PHOTOS) {
  const found = await payload.find({
    collection: 'media',
    where: { filename: { equals: ph.file } },
    limit: 1,
    overrideAccess: true,
  })
  if (found.totalDocs > 0) {
    mediaIds[ph.file] = found.docs[0].id
    log(`= ${ph.file} уже в Media (id=${found.docs[0].id})`)
  } else {
    const created = await payload.create({
      collection: 'media',
      data: { alt: `${ph.alt}. Фото: ${ph.author}, ВКонтакте` } as any,
      filePath: path.resolve(dirname, 'assets', 'vk-obzor-2026', ph.file),
      overrideAccess: true,
    })
    mediaIds[ph.file] = created.id
    log(`✓ ${ph.file} → Media (id=${created.id})`)
  }
}

// 2. Пост (ru), идемпотентно по slug.
const dataRu = {
  title: TITLE_RU,
  excerpt: EXCERPT_RU,
  body: bodyRu(mediaIds),
  cover: mediaIds[COVER_FILE],
  videos: VIDEOS,
}
const existing = await payload.find({
  collection: 'news',
  where: { slug: { equals: SLUG } },
  limit: 1,
  overrideAccess: true,
})
let id: number | string
if (existing.totalDocs > 0) {
  id = existing.docs[0].id
  if (force) {
    await payload.update({ collection: 'news', id, data: dataRu as any, overrideAccess: true })
    log(`↻ ru /novosti/${SLUG} обновлён (SEED_FORCE)`)
  } else {
    log(`= /novosti/${SLUG} уже есть — ru-тело не трогаю`)
  }
} else {
  const created = await payload.create({
    collection: 'news',
    data: {
      ...dataRu,
      slug: SLUG,
      _status: 'published',
      publishedAt: '2026-07-04T21:30:00.000+03:00',
    } as any,
    overrideAccess: true,
  })
  id = created.id
  log(`✓ ru /novosti/${SLUG} — «${TITLE_RU}»`)
}

// 3. tt-черновик пишем всегда (перезаписывает только tt).
await payload.update({
  collection: 'news',
  id,
  locale: 'tt',
  data: { title: TITLE_TT, excerpt: EXCERPT_TT, body: bodyTt(mediaIds) } as any,
  overrideAccess: true,
})
log(`✓ tt /tt/novosti/${SLUG} — «${TITLE_TT}» (черновик)`)

log('Готово. Пост-обзор опубликован.')
process.exit(0)
