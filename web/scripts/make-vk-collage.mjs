// Генератор вертикального VK-коллажа «Сабантуй-2026: большой фоторепортаж».
//   corepack pnpm -C web exec node scripts/make-vk-collage.mjs   (из web/)
// Источник фото — assets 2-го обзор-поста; результат — docs/social/…-vk.jpg.
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
const require = createRequire(import.meta.url)
const sharp = require('sharp')
const HERE = path.dirname(fileURLToPath(import.meta.url)) // web/scripts
const DIR = path.join(HERE, '../src/seed/assets/vk-obzor2-2026/')
const OUT = path.join(HERE, '../../docs/social/sabantuy-2026-fotoreportazh-vk.png')
const W = 1080, H = 1350

// 6 гранёных ячеек со скошенными швами (панорама-героем сверху, 2 в середине, 3 снизу)
const cells = [
  { file: 'obzor2-panorama.jpg',    poly: [[0,0],[1080,0],[1080,320],[0,270]] },
  { file: 'obzor2-devushki.jpg',    poly: [[0,270],[620,300],[470,740],[0,740]] },
  { file: 'obzor2-garmon.jpg',      poly: [[620,300],[1080,320],[1080,740],[470,740]] },
  { file: 'obzor2-koresh.jpg',      poly: [[0,740],[370,740],[300,1350],[0,1350]] },
  { file: 'obzor2-chak-chak.jpg',   poly: [[370,740],[760,740],[830,1350],[300,1350]] },
  { file: 'obzor2-skachki.jpg',     poly: [[760,740],[1080,740],[1080,1350],[830,1350]] },
]

const bbox = (poly) => {
  const xs = poly.map(p => p[0]), ys = poly.map(p => p[1])
  const x = Math.min(...xs), y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

const layers = []
for (const c of cells) {
  const b = bbox(c.poly)
  const img = await sharp(DIR + c.file).rotate().resize(b.w, b.h, { fit: 'cover', position: 'attention' }).toBuffer()
  const pts = c.poly.map(p => `${p[0] - b.x},${p[1] - b.y}`).join(' ')
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}"><polygon points="${pts}" fill="#fff"/></svg>`)
  const clipped = await sharp(img).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  layers.push({ input: clipped, left: b.x, top: b.y })
}

// Золотые швы (обводка полигонов)
const seams = cells.map(c => `<polygon points="${c.poly.map(p => p.join(',')).join(' ')}" fill="none" stroke="#e8c24a" stroke-width="4"/>`).join('')
// Рамка
const border = `<rect x="2" y="2" width="${W-4}" height="${H-4}" fill="none" stroke="#e8c24a" stroke-width="5"/>`

// Нижнее затемнение + надпись в 3 строки
const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.50" stop-color="#08281a" stop-opacity="0"/>
      <stop offset="0.70" stop-color="#08281a" stop-opacity="0.55"/>
      <stop offset="0.82" stop-color="#072115" stop-opacity="0.90"/>
      <stop offset="1" stop-color="#04120b" stop-opacity="0.98"/>
    </linearGradient>
  </defs>
  <rect x="0" y="680" width="${W}" height="${H-680}" fill="url(#scrim)"/>
  <rect x="0" y="1075" width="${W}" height="275" fill="#05150d" opacity="0.42"/>
  ${seams}
  ${border}
  <line x1="300" y1="1058" x2="780" y2="1058" stroke="#e8c24a" stroke-width="3"/>
  <text x="540" y="1160" text-anchor="middle" font-family="Arial" font-weight="800" font-size="88" fill="#ffd23f" stroke="#06170f" stroke-width="2">Сабантуй-2026</text>
  <text x="540" y="1238" text-anchor="middle" font-family="Arial" font-weight="700" font-size="60" fill="#ffffff">Спасибо за праздник!</text>
  <text x="540" y="1300" text-anchor="middle" font-family="Arial" font-weight="700" font-size="46" fill="#ffe9a8">Большой фоторепортаж</text>
  <text x="540" y="1336" text-anchor="middle" font-family="Arial" font-weight="600" font-size="30" fill="#cfe8d8">сабантуй.вмалмыже.рф</text>
</svg>`
layers.push({ input: Buffer.from(overlay), left: 0, top: 0 })

await sharp({ create: { width: W, height: H, channels: 3, background: '#06170f' } })
  .composite(layers)
  .jpeg({ quality: 90 })
  .toFile(OUT.replace('.png', '.jpg'))
console.log('collage written:', OUT.replace('.png', '.jpg'))
