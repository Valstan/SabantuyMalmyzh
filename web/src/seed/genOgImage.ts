/**
 * Генерация статичной OG-картинки (Open Graph / Twitter card) — превью сайта при
 * шеринге в соцсетях/мессенджерах (VK, Telegram…). Один раз генерим брендовый
 * баннер 1200×630 и коммитим в web/public/og.jpg; в метаданных (layout.tsx)
 * ссылаемся на /og.jpg. Кириллица растеризуется через системный шрифт (SVG→jpg).
 *
 *   corepack pnpm -C web payload run src/seed/genOgImage.ts
 *
 * Перегенерировать при смене заголовка/палитры. Payload тут не используется.
 */
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import sharp from 'sharp'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const out = path.resolve(dirname, '../../public/og.jpg')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#155c39"/>
      <stop offset="0.55" stop-color="#1f7a4d"/>
      <stop offset="1" stop-color="#7a1f2b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="26" y="26" width="1148" height="578" fill="none" stroke="#e8b53a" stroke-width="6" rx="20"/>
  <g fill="none" stroke="#e8b53a" stroke-width="4" stroke-linecap="round" opacity="0.9" transform="translate(600,150)">
    <path d="M0 60 V18"/>
    <path d="M0 18 C-34 18 -52 -22 -46 -52 C-22 -28 -10 -28 0 -44 C10 -28 22 -28 46 -52 C52 -22 34 18 0 18 Z"/>
  </g>
  <text x="600" y="290" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-style="italic" fill="#e8b53a" text-anchor="middle">Народный праздник Малмыжа</text>
  <text x="600" y="392" font-family="Georgia, 'Times New Roman', serif" font-size="98" font-weight="bold" fill="#fff7e6" text-anchor="middle">Сабантуй Малмыж</text>
  <text x="600" y="470" font-family="Arial, sans-serif" font-size="34" fill="#fff7e6" text-anchor="middle">Праздник труда, силы и дружбы народов</text>
</svg>`

const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer()
await fs.writeFile(out, buf)
console.log(`og.jpg записан: ${out} (${buf.length} байт)`)
process.exit(0)
