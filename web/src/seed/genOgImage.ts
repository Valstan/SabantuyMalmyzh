/**
 * Генерация статичной OG-картинки (Open Graph / Twitter card) — превью сайта при
 * шеринге в соцсетях/мессенджерах (VK, Telegram…). Один раз генерим брендовый
 * баннер 1200×630 и коммитим в web/public/og.jpg; в метаданных (layout.tsx)
 * ссылаемся на /og.jpg. Кириллица растеризуется через системный шрифт (SVG→jpg).
 *
 *   corepack pnpm -C web payload run src/seed/genOgImage.ts
 *
 * Фон — реальный праздничный кадр из web/public/decor/ (закоммичен, не зависит от
 * gitignored design/), поверх — вуаль для читаемости + золотая рамка/тюльпан + текст
 * с тенью. Перегенерировать при смене фона/заголовка/палитры. Payload тут не нужен.
 */
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import sharp from 'sharp'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const out = path.resolve(dirname, '../../public/og.jpg')
// Панорама майдана (флаги/толпа/поле) — самый «баннерный» кадр; 1920×823 → без апскейла.
const bgSrc = path.resolve(dirname, '../../public/decor/page-maydan-lg.webp')

// Накладка: вуаль (темнит к центру/низу под текст) + рамка + тюльпан + текст с тенью.
const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0c3a24" stop-opacity="0.55"/>
      <stop offset="0.42" stop-color="#0a3221" stop-opacity="0.42"/>
      <stop offset="0.72" stop-color="#093020" stop-opacity="0.54"/>
      <stop offset="1" stop-color="#072618" stop-opacity="0.74"/>
    </linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#08160d" flood-opacity="0.85"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#veil)"/>
  <rect x="26" y="26" width="1148" height="578" fill="none" stroke="#e8b53a" stroke-width="6" rx="20"/>
  <g fill="none" stroke="#e8b53a" stroke-width="4" stroke-linecap="round" filter="url(#sh)" transform="translate(600,150)">
    <path d="M0 60 V18"/>
    <path d="M0 18 C-34 18 -52 -22 -46 -52 C-22 -28 -10 -28 0 -44 C10 -28 22 -28 46 -52 C52 -22 34 18 0 18 Z"/>
  </g>
  <g filter="url(#sh)" text-anchor="middle">
    <text x="600" y="290" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-style="italic" fill="#f4c54a">Народный праздник Малмыжа</text>
    <text x="600" y="392" font-family="Georgia, 'Times New Roman', serif" font-size="98" font-weight="bold" fill="#fff7e6">Сабантуй Малмыж</text>
    <text x="600" y="470" font-family="Arial, sans-serif" font-size="34" fill="#fff7e6">Праздник труда, силы и дружбы народов</text>
  </g>
</svg>`

const bg = await sharp(bgSrc).resize(1200, 630, { fit: 'cover', position: 'attention' }).toBuffer()
const buf = await sharp(bg)
  .composite([{ input: Buffer.from(overlay) }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toBuffer()
await fs.writeFile(out, buf)
console.log(`og.jpg записан: ${out} (${buf.length} байт)`)
process.exit(0)
