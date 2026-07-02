// Миниатюры расписания из свободных фото Wikimedia Commons (PR «релевантные
// фото программы»): design/commons/<src> → web/public/decor/feat-*-{480,768}.jpg.
// Источники/авторы/лицензии — единый реестр web/src/lib/imageCredits.ts
// (он же рендерит страницу «Источники фотографий»). Запуск из web/:
//   node scripts/process-commons-covers.mjs
import sharp from 'sharp'
import { existsSync, mkdirSync } from 'fs'

const DIR = '../design/commons'
const OUT = 'public/decor'
const SIZES = [768, 480]
const ch = (w) => Math.round((w * 3) / 4)

// slug → исходник; position — как кадрировать 4:3 (attention = по сюжету)
const COVERS = [
  { slug: 'feat-volleyball', src: 'commons-volleyball.jpg' },
  { slug: 'feat-football', src: 'commons-football.jpg' },
  { slug: 'feat-gift', src: 'commons-gift.jpg' },
  // Кул-Шариф: купол с минаретами в средней трети портретного кадра
  { slug: 'feat-mosque', src: 'commons-mosque.jpg' },
]

mkdirSync(OUT, { recursive: true })
for (const { slug, src, position = 'attention' } of COVERS) {
  const path = `${DIR}/${src}`
  if (!existsSync(path)) {
    console.warn(slug, 'SKIP — исходник не найден:', src)
    continue
  }
  for (const w of SIZES) {
    await sharp(path)
      .resize(w, ch(w), { fit: 'cover', position })
      .jpeg({ quality: 74, mozjpeg: true })
      .toFile(`${OUT}/${slug}-${w}.jpg`)
  }
  console.log(slug, 'ok')
}
