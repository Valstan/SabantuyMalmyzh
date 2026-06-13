// Разовый конвейер AI-картинок (docs/design/IMAGE_PIPELINE.md):
// design/incoming/<src> → кадр 21:9 → web/public/decor/<slug>-{w}.{webp,jpg}.
// Запуск из web/: node scripts/process-decor.mjs
import sharp from 'sharp'
import { existsSync, mkdirSync } from 'fs'

// Принятые оригиналы переезжают в accepted/ (запас — в accepted/spare/) — ищем во всех,
// чтобы скрипт был перезапускаем
const DIRS = ['../design/incoming', '../design/accepted', '../design/accepted/spare']
const OUT = 'public/decor'

// slug → исходник; large-ширина = ширина кадра 21:9 без апскейла
const JOBS = [
  { slug: 'page-maydan', src: 'page-maydan.jpg', large: 1920 },
  // south: attention-кадр резал плуг — берём нижнюю полосу (плуг+полотенце+тюльпаны)
  { slug: 'page-istoriya', src: '_96e0359e-1553-4ccd-92d8-632f7de5be6c.jpg', large: 1536, position: 'south' },
  {
    slug: 'page-kuhnya',
    src: 'lucid-origin_a_cinematic_photo_of_Festive_Tatar_national_cuisine_spread_at_an_open-air_summer-0.jpg',
    large: 1344,
  },
  { slug: 'page-o-sabantuy', src: '_3d374651-9aea-4849-9965-853375499818.jpg', large: 1248 },
  // Карточка №2 (2026-06-13)
  {
    slug: 'page-narody',
    src: 'lucid-origin_Festive_display_of_folk_cultures_at_a_summer_festival_traditional_Tatar_Russian_-0 (1).jpg',
    large: 1344,
  },
  { slug: 'page-podvorya', src: '_36754e55-73eb-482f-a145-0525646e271e.jpg', large: 1248 },
  { slug: 'page-detskiy', src: '_d1bb9229-c8d0-4bcb-bb25-e43610d54aa1.jpg', large: 1248 },
  { slug: 'page-doroga', src: '_62090581-cd7e-4090-8bc2-0b0da5e5a5d7.jpg', large: 1248 },
  // Карточка №3 (2026-06-13): фото-шапки последних страниц без фото
  { slug: 'page-faq', src: 'lucid-origin_Wide_welcoming_entrance_to_an_open-air_Tatar_summer_festival_visitors_seen_from_-0.jpg', large: 1344 },
  { slug: 'page-kontakty', src: 'lucid-origin_A_stunning_and_vibrant_cinematic_photo_of_Scenic_panorama_of_a_small_provincial_-0.jpg', large: 1344 },
]

// Орнамент-медальон (карточка №3): круглая эмблема для шапок без фото (privacy и
// неизвестные slug) вместо линейной мотив-иконки. Квадрат, кроп по центру → в CSS
// border-radius:50%. Кремовый фон орнамента уходит за круг — кеинг не нужен.
const ROUNDEL = { slug: 'decor-roundel', src: '_76b42a6c-aa1d-4f2d-97e0-1c995846c744.jpg', size: 320 }

// Обложки культ-разделов (4:3) на главной — кроп тех же исходников, что и шапки
// страниц, чтобы карточка хаба была мини-превью своей страницы. Два размера под
// srcset: 768 (десктоп-retina, ~350px карточка) + 480 (моб. 2-колонки). faq — без
// фото (нет тематического исходника), рисуется градиент-иконкой в FeatureCard.
const COVERS = [
  { slug: 'card-narody', src: 'lucid-origin_Festive_display_of_folk_cultures_at_a_summer_festival_traditional_Tatar_Russian_-0 (1).jpg' },
  { slug: 'card-podvorya', src: '_36754e55-73eb-482f-a145-0525646e271e.jpg' },
  { slug: 'card-istoriya', src: '_96e0359e-1553-4ccd-92d8-632f7de5be6c.jpg', position: 'south' },
  { slug: 'card-maydan', src: 'page-maydan.jpg' },
  { slug: 'card-detskiy', src: '_d1bb9229-c8d0-4bcb-bb25-e43610d54aa1.jpg' },
  { slug: 'card-kuhnya', src: 'lucid-origin_a_cinematic_photo_of_Festive_Tatar_national_cuisine_spread_at_an_open-air_summer-0.jpg' },
  { slug: 'card-doroga', src: '_62090581-cd7e-4090-8bc2-0b0da5e5a5d7.jpg' },
  // Карточка №4 (2026-06-13): обложки фича-ряда «Что вас ждёт» + категория-миниатюры расписания
  { slug: 'feat-koresh', src: '_89d7cce8-4e9f-48c8-b919-7bdc2f0166c3.jpg' },
  { slug: 'feat-horse', src: 'high-level-description-a-photograph-of-t_MUAY_na2XCOm5dTrMP_5Uw_n_mQ9gI3SB2roSj-05YXwA.jpg' },
  { slug: 'feat-pole', src: 'high-level-description-a-photograph-of-a_93BtB8v9WvqnjKvUP6rc9g_aN5Uxx5XSDSU8tcYs2J3Ig.jpg' },
  { slug: 'feat-cuisine', src: 'lucid-origin_a_cinematic_photo_of_Festive_Tatar_national_cuisine_spread_at_an_open-air_summer-0.jpg' },
  { slug: 'feat-concert', src: 'lucid-origin_Folk_dancers_in_colorful_Tatar_Russian_costumes_on_an_open-air_stage_dynamic_fro-0.jpg' },
  { slug: 'feat-kids', src: 'lucid-origin_Children_s_play_meadow_painted_wooden_rocking_horses_swings_balloons_bunting_on_-0.jpg' },
  { slug: 'cat-ceremony', src: 'lucid-origin_Festive_opening_ceremony_a_flag_being_raised_on_a_decorated_stage_bunting_crowd_-0.jpg' },
]
const COVER_SIZES = [768, 480]

const h = (w) => Math.round((w * 9) / 21)
const ch = (w) => Math.round((w * 3) / 4)

mkdirSync(OUT, { recursive: true })
for (const { slug, src, large, position = 'attention' } of JOBS) {
  const dir = DIRS.find((d) => existsSync(`${d}/${src}`))
  if (!dir) {
    console.warn(slug, 'SKIP — исходник не найден:', src)
    continue
  }
  for (const w of [large, 960]) {
    const base = sharp(`${dir}/${src}`).resize(w, h(w), { fit: 'cover', position })
    await base.clone().webp({ quality: 80 }).toFile(`${OUT}/${slug}-${w === 960 ? 960 : 'lg'}.webp`)
    await base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(`${OUT}/${slug}-${w === 960 ? 960 : 'lg'}.jpg`)
  }
  console.log(slug, 'ok')
}

for (const { slug, src, position = 'attention' } of COVERS) {
  const dir = DIRS.find((d) => existsSync(`${d}/${src}`))
  if (!dir) {
    console.warn(slug, 'SKIP — исходник не найден:', src)
    continue
  }
  // Только JPG (mozjpeg): на этих детализированных кадрах webp тяжелее jpg, а
  // обложки маленькие и ленивые — `<img srcset>` проще image-set и без лишнего веса.
  for (const w of COVER_SIZES) {
    await sharp(`${dir}/${src}`)
      .resize(w, ch(w), { fit: 'cover', position })
      .jpeg({ quality: 74, mozjpeg: true })
      .toFile(`${OUT}/${slug}-${w}.jpg`)
  }
  console.log(slug, 'ok')
}

// Орнамент-медальон: квадратный кроп по центру
{
  const { slug, src, size } = ROUNDEL
  const dir = DIRS.find((d) => existsSync(`${d}/${src}`))
  if (dir) {
    await sharp(`${dir}/${src}`)
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(`${OUT}/${slug}.jpg`)
    console.log(slug, 'ok')
  } else {
    console.warn(slug, 'SKIP — исходник не найден:', src)
  }
}

// Карточка №3 ч.2 — орнамент-полоса (разделитель секций + баннер на главной):
// горизонтальная полоса из центра орнамент-панели, 1920×300, cover.
{
  const slug = 'decor-ornament-band'
  const src = '_7fb6184d-a981-4312-82d0-cc3305b1a281.jpg'
  const dir = DIRS.find((d) => existsSync(`${d}/${src}`))
  if (dir) {
    const base = sharp(`${dir}/${src}`).resize(1920, 300, { fit: 'cover', position: 'centre' })
    await base.clone().webp({ quality: 80 }).toFile(`${OUT}/${slug}.webp`)
    await base.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(`${OUT}/${slug}.jpg`)
    console.log(slug, 'ok')
  } else {
    console.warn(slug, 'SKIP — исходник не найден:', src)
  }
}

// Карточка №3 ч.2 — тюльпаны фоном секции (отсчёт): широкий 16:9, lg+960.
{
  const slug = 'decor-tulips'
  const src = 'lucid-origin_festive_summer_atmosphere_warm_sunlight_emerald_green_and_golden_palette_with_su-0.jpg'
  const dir = DIRS.find((d) => existsSync(`${d}/${src}`))
  if (dir) {
    for (const w of [1600, 960]) {
      const base = sharp(`${dir}/${src}`).resize(w, Math.round((w * 9) / 16), { fit: 'cover', position: 'attention' })
      const tag = w === 960 ? 960 : 'lg'
      await base.clone().webp({ quality: 80 }).toFile(`${OUT}/${slug}-${tag}.webp`)
      await base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(`${OUT}/${slug}-${tag}.jpg`)
    }
    console.log(slug, 'ok')
  } else {
    console.warn(slug, 'SKIP — исходник не найден:', src)
  }
}

// Карточка №4 — силуэт города Малмыжа для подвала: кроп полосы со скайлайном →
// белый фон в прозрачность (порог по яркости) → перекрас в кремовый → прозрачный PNG.
{
  const slug = 'footer-skyline'
  const src = 'lucid-origin_flat_single-color_silhouette_clean_simple_vector_shapes_no_gradient_no_inner_det-0.jpg'
  const dir = DIRS.find((d) => existsSync(`${d}/${src}`))
  if (dir) {
    const meta = await sharp(`${dir}/${src}`).metadata()
    // полоса со зданиями (≈36–66% высоты): от чуть выше шпилей до линии воды,
    // плотно — чтобы в подвале была невысокой лентой (вставляется как <img> во всю ширину)
    const top = Math.round(meta.height * 0.36)
    const bandH = Math.round(meta.height * 0.3)
    const band = sharp(`${dir}/${src}`).extract({ left: 0, top, width: meta.width, height: bandH })
    const bandBuf = await band.toBuffer()
    const bm = await sharp(bandBuf).metadata()
    // alpha: тёмное (силуэт) → 255 (непрозрачно), белое → 0
    const alpha = await sharp(bandBuf)
      .greyscale()
      .threshold(180)
      .negate()
      .toColourspace('b-w')
      .raw()
      .toBuffer()
    // кремовая заливка + полученная маска как альфа
    await sharp({ create: { width: bm.width, height: bm.height, channels: 3, background: { r: 244, g: 236, b: 216 } } })
      .joinChannel(alpha, { raw: { width: bm.width, height: bm.height, channels: 1 } })
      .png()
      .toFile(`${OUT}/${slug}.png`)
    console.log(slug, 'ok')
  } else {
    console.warn(slug, 'SKIP — исходник не найден:', src)
  }
}
