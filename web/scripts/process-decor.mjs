// Разовый конвейер AI-картинок (docs/design/IMAGE_PIPELINE.md):
// design/incoming/<src> → кадр 21:9 → web/public/decor/<slug>-{w}.{webp,jpg}.
// Запуск из web/: node scripts/process-decor.mjs
import sharp from 'sharp'
import { existsSync, mkdirSync } from 'fs'

// Принятые оригиналы переезжают в accepted/ — ищем в обоих, чтобы скрипт был перезапускаем
const DIRS = ['../design/incoming', '../design/accepted']
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
]

const h = (w) => Math.round((w * 9) / 21)

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
