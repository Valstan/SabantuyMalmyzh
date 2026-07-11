/**
 * Второй пост-обзор «Сабантуй-2026: спасибо за праздник! Большой фоторепортаж» —
 * фото-репортаж дня по свежим публикациям ВКонтакте (сбор 2026-07-11, коллектор
 * collectVkCandidates: newsfeed.search «Сабантуй Малмыж»). Дополняет пост-дня
 * `sabantuy-2026-kak-eto-bylo` (тот — оперативная сводка вечера 04.07; этот —
 * фото-путешествие по празднику неделю спустя, с благодарностью участникам).
 *
 *   corepack pnpm -C web payload run src/seed/seedVkObzor2.ts
 *
 * Каждое фото атрибутировано автору со ссылкой на исходный VK-пост (раздел
 * «Источники»). Фото — web/src/seed/assets/vk-obzor2-2026/ (1600px), грузятся в
 * Media по filePath (на проде — MEDIA_DIR). Видео — поле `videos` (штатный плеер).
 * Идемпотентно: пост по slug есть → ru-тело не трогается; SEED_FORCE=1 перезаписывает.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- seed-утилита: Payload data untyped */
import config from '@payload-config'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const log = (m: string) => console.log(m)

// ─── Lexical-конструктор (как в seedVkObzor2026) ─────────────────────────────
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
  type, version: 1, format: '', indent: 0, direction: 'ltr', ...extra, children,
})
const p = (text: string): LexNode => block('paragraph', { textFormat: 0, textStyle: '' }, inline(text))
const h2 = (text: string): LexNode => block('heading', { tag: 'h2' }, inline(text))
const link = (text: string, url: string): LexNode =>
  block('link', { fields: { linkType: 'custom', newTab: true, url }, version: 2 }, inline(text))
const li = (children: LexNode[], value: number): LexNode => block('listitem', { value }, children)
const ulNodes = (items: LexNode[][]): LexNode =>
  block('list', { listType: 'bullet', start: 1, tag: 'ul' }, items.map((ch, i) => li(ch, i + 1)))
const doc = (...children: LexNode[]): unknown => ({
  root: { type: 'root', version: 1, format: '', indent: 0, direction: 'ltr', children },
})
const up = (mediaId: number | string): LexNode => ({
  type: 'upload', version: 3, relationTo: 'media', value: mediaId, id: `seed-up-${mediaId}`, fields: {}, format: '',
})

// ─── Фото: файл → alt + источник ─────────────────────────────────────────────
type Photo = { file: string; alt: string; author: string; post: string }
const PHOTOS: Photo[] = [
  { file: 'obzor2-panorama.jpg', alt: 'Панорама майдана: тысячи гостей на межрегиональном Сабантуе', author: 'МАЛМЫЖ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-158787639_77196' },
  { file: 'obzor2-gubernator.jpg', alt: 'Почётные гости и делегации с полотенцами «Сабантуй»', author: 'МБУК Малмыжский районный Центр культуры и досуга', post: 'https://vk.com/wall-217788511_5313' },
  { file: 'obzor2-devushki.jpg', alt: 'Участницы праздника в национальных костюмах', author: 'МАЛМЫЖ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-158787639_77205' },
  { file: 'obzor2-chak-chak.jpg', alt: 'Праздничный стол с чак-чаком и национальной выпечкой', author: 'МАЛМЫЖ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-158787639_77211' },
  { file: 'obzor2-podvorye-stol.jpg', alt: 'Национальное подворье встречает гостей угощениями', author: 'МАЛМЫЖ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-158787639_77211' },
  { file: 'obzor2-garmon.jpg', alt: 'Гармонисты в национальных костюмах на майдане', author: 'МАЛМЫЖ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-158787639_77205' },
  { file: 'obzor2-tancy.jpg', alt: 'Народные танцы на главной сцене праздника', author: 'МБУК Малмыжский районный Центр культуры и досуга', post: 'https://vk.com/wall-217788511_5313' },
  { file: 'obzor2-skachki.jpg', alt: 'Конные скачки — наездники на дистанции', author: 'Администрация Малмыжского района', post: 'https://vk.com/wall-156168183_14273' },
  { file: 'obzor2-koresh.jpg', alt: 'Национальная борьба корэш на ковре майдана', author: 'МАЛМЫЖ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-158787639_77196' },
  { file: 'obzor2-armrestling.jpg', alt: 'Состязание по армрестлингу', author: 'Гульшат Закиева', post: 'https://vk.com/wall229000873_3088' },
  { file: 'obzor2-kanat.jpg', alt: 'Перетягивание каната — командная забава Сабантуя', author: 'Центральная библиотека г. Малмыжа', post: 'https://vk.com/wall-121966530_3461' },
  { file: 'obzor2-nagrazhdenie.jpg', alt: 'Награждение победителей на главной сцене', author: 'МАЛМЫЖ - ИНФО | Афиша, новости, события', post: 'https://vk.com/wall-158787639_77209' },
  { file: 'obzor2-remesla.jpg', alt: 'Изделия народных ремёсел — глиняная игрушка', author: 'Гульшат Закиева', post: 'https://vk.com/wall229000873_3088' },
  { file: 'obzor2-deti.jpg', alt: 'Детская площадка Сабантуя', author: 'МКДОУ детский сад «Сандугач» с. Новая Смаиль', post: 'https://vk.com/wall-204441831_1828' },
]
const COVER_FILE = 'obzor2-panorama.jpg'

const VIDEOS = [
  { url: 'https://vk.com/video-163630299_456245997', title: 'Репортаж с межрегионального Сабантуя (Правительство Кировской области)' },
  { url: 'https://vk.com/video-48533011_456243295', title: 'Атмосфера праздника (КИРОВ 24/7)' },
]

const SLUG = 'sabantuy-2026-fotoreportazh'
const TITLE_RU = 'Сабантуй-2026: спасибо за праздник! Большой фоторепортаж'
const EXCERPT_RU =
  'Неделю назад малмыжская земля принимала межрегиональный Сабантуй-2026. Собрали большой фоторепортаж дня — ' +
  'майдан и подворья, скачки и корэш, песни и танцы, богатырские забавы и награждение победителей. ' +
  'Спасибо всем, кто подарил празднику своё тепло!'

const bodyRu = (m: Record<string, number | string>) =>
  doc(
    p('Прошла неделя с межрегионального **Сабантуя-2026** в Малмыже, а тёплые кадры праздника всё ещё наполняют ленты земляков. Мы собрали большой фоторепортаж дня — чтобы ещё раз пройтись по майдану, подворьям и сцене вместе с вами.'),
    up(m[COVER_FILE]),
    h2('Майдан собрал тысячи'),
    p('На поле у села Калинино в этот день было по-настоящему многолюдно: делегации районов и регионов, гости в национальных костюмах, песни на нескольких языках. Праздник дружбы народов объединил русских, татар, марийцев и удмуртов — как это и повелось на малмыжской земле.'),
    up(m['obzor2-gubernator.jpg']),
    up(m['obzor2-devushki.jpg']),
    h2('Подворья и угощения'),
    p('«Национальная деревня» встречала гостей столами с чак-чаком, эчпочмаками, караваями и мёдом. У каждого подворья — свой характер, своя кухня и радушные хозяева.'),
    up(m['obzor2-chak-chak.jpg']),
    up(m['obzor2-podvorye-stol.jpg']),
    h2('Песни и танцы'),
    p('Весь день на сцене и прямо на траве звучали гармонь и народные песни, кружились танцы. Творческие коллективы Малмыжского и соседних районов не давали площадкам замолчать ни на минуту.'),
    up(m['obzor2-garmon.jpg']),
    up(m['obzor2-tancy.jpg']),
    h2('Богатырские забавы'),
    p('Спортивная часть Сабантуя была жаркой: **конные скачки**, национальная борьба **корэш**, армрестлинг, гиревой спорт и, конечно, перетягивание каната. Батыры мерились силой под азартный гул трибун.'),
    up(m['obzor2-skachki.jpg']),
    up(m['obzor2-koresh.jpg']),
    up(m['obzor2-armrestling.jpg']),
    up(m['obzor2-kanat.jpg']),
    h2('Награды героям'),
    p('Победителей состязаний и самых активных участников чествовали на главной сцене — грамоты, кубки и подарки нашли своих героев.'),
    up(m['obzor2-nagrazhdenie.jpg']),
    h2('Ремёсла и детвора'),
    p('Мастера показывали изделия народных промыслов, а на детской площадке весь день кипели игры, мастер-классы и выступления самых юных артистов.'),
    up(m['obzor2-remesla.jpg']),
    up(m['obzor2-deti.jpg']),
    p('Спасибо всем, кто был на Сабантуе и делился кадрами! Больше фотографий праздника — на нашей **Фотостене**, а свои снимки и видео вы всегда можете добавить в **«Народную ленту»** сайта.'),
    h2('Источники фото и видео'),
    p('Фоторепортаж составлен по открытым публикациям ВКонтакте о Сабантуе в Малмыже. Авторы фотографий:'),
    ulNodes(
      Array.from(
        PHOTOS.reduce((acc, ph) => {
          if (!acc.has(ph.post)) acc.set(ph.post, ph.author)
          return acc
        }, new Map<string, string>()),
      ).map(([post, author]) => [...inline(`${author} — `), link('пост ВКонтакте', post)]),
    ),
    p('Права на материалы принадлежат их авторам; фото приведены с указанием источника. Если вы автор и хотите, чтобы материал убрали или подписали иначе, — напишите нам через форму на сайте.'),
  )

// ─── Татарский черновик (вычитка носителем — PENDING) ────────────────────────
const TITLE_TT = 'Сабантуй-2026: бәйрәм өчен рәхмәт! Зур фоторепортаж'
const EXCERPT_TT =
  'Атна элек Малмыж җире төбәкара Сабантуй-2026не кабул итте. Көннең зур фоторепортажын җыйдык — мәйдан һәм ' +
  'ихаталар, ат чабышлары һәм көрәш, җырлар һәм биюләр, батырлар ярышы һәм җиңүчеләрне бүләкләү. Барыгызга да рәхмәт!'
const bodyTt = (m: Record<string, number | string>) =>
  doc(
    p('Малмыждагы төбәкара **Сабантуй-2026**дан бер атна узды, ә бәйрәмнең җылы кадрлары әле дә якташлар тасмаларын тутыра. Без көннең зур фоторепортажын җыйдык.'),
    up(m[COVER_FILE]),
    h2('Мәйдан меңләгән кешене җыйды'),
    p('Калинино авылы янындагы кырда бу көнне бик күп кеше иде: районнар һәм төбәкләр делегацияләре, милли киемдәге кунаклар, төрле телләрдә җырлар. Дуслык бәйрәме рус, татар, мари һәм удмуртларны берләштерде.'),
    up(m['obzor2-devushki.jpg']),
    up(m['obzor2-chak-chak.jpg']),
    h2('Җыр, бию һәм батырлар ярышы'),
    p('Көне буе гармун һәм халык җырлары яңгырады, биюләр әйләнде. Спорт өлеше кызу булды: **ат чабышлары**, милли **көрәш**, армрестлинг, гер күтәрү һәм аркан тартыш.'),
    up(m['obzor2-skachki.jpg']),
    up(m['obzor2-koresh.jpg']),
    p('Сабантуйда булган һәм кадрлары белән бүлешкән һәркемгә рәхмәт! Күбрәк фото — сайтның **Фотостенасында**, ә үз рәсемнәрегезне **«Халык лентасына»** өстәгез.'),
  )

// ─── Run ──────────────────────────────────────────────────────────────────────
const payload = await getPayload({ config })
const force = process.env.SEED_FORCE === '1'

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
      filePath: path.resolve(dirname, 'assets', 'vk-obzor2-2026', ph.file),
      overrideAccess: true,
    })
    mediaIds[ph.file] = created.id
    log(`✓ ${ph.file} → Media (id=${created.id})`)
  }
}

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
    data: { ...dataRu, slug: SLUG, _status: 'published', publishedAt: '2026-07-11T12:00:00.000+03:00' } as any,
    overrideAccess: true,
  })
  id = created.id
  log(`✓ ru /novosti/${SLUG} — «${TITLE_RU}»`)
}

await payload.update({
  collection: 'news',
  id,
  locale: 'tt',
  data: { title: TITLE_TT, excerpt: EXCERPT_TT, body: bodyTt(mediaIds) } as any,
  overrideAccess: true,
})
log(`✓ tt /tt/novosti/${SLUG} — «${TITLE_TT}» (черновик)`)

log('Готово. Второй пост-обзор опубликован.')
process.exit(0)
