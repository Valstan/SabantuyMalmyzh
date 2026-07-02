// Медиа группы «АВСТРАЛИЯ» (фото переданы владельцем, права — у группы/оргкомитета):
// design/events-avstralia/ → миниатюра программы + шапка события + галерея.
// Запуск из web/: node scripts/process-avstralia.mjs
import sharp from 'sharp'
import { existsSync, mkdirSync, readdirSync } from 'fs'

const DIR = '../design/events-avstralia'
const DECOR = 'public/decor'
const OUT = 'public/events/avstralia'

mkdirSync(OUT, { recursive: true })

// 1. Миниатюра расписания (4:3, как остальные feat-*)
for (const w of [768, 480]) {
  await sharp(`${DIR}/hero.jpg`)
    .resize(w, Math.round((w * 3) / 4), { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 74, mozjpeg: true })
    .toFile(`${DECOR}/feat-avstralia-${w}.jpg`)
}
console.log('feat-avstralia ok')

// 2. Шапка страницы события (широкая 16:9, ~1600)
await sharp(`${DIR}/hero.jpg`)
  .resize(1600, 900, { fit: 'cover', position: 'attention' })
  .jpeg({ quality: 78, mozjpeg: true })
  .toFile(`${OUT}/hero.jpg`)
console.log('hero ok')

// 3. Галерея: полный кадр (ширина ≤1600, без кропа) + миниатюра 480 (4:3)
const photos = readdirSync(DIR).filter((f) => /^photo-\d+\.jpg$/.test(f)).sort()
for (const f of photos) {
  const base = f.replace('.jpg', '')
  await sharp(`${DIR}/${f}`)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(`${OUT}/${base}.jpg`)
  await sharp(`${DIR}/${f}`)
    .resize(480, 360, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 74, mozjpeg: true })
    .toFile(`${OUT}/${base}-480.jpg`)
  console.log(base, 'ok')
}
if (!existsSync(`${DIR}/hero.jpg`)) console.warn('hero.jpg не найден')
