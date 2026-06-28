/**
 * Генерация иконок PWA («Сабантуй в Малмыже») — для манифеста (установка «на экран»)
 * и apple-touch. Один раз генерим брендовый набор (тюльпан-мотив на изумруде +
 * золотая кромка) и коммитим в web/public/icons/. Кириллица не растеризуется —
 * иконка чисто графическая (SVG→png через sharp).
 *
 *   corepack pnpm -C web payload run src/seed/genPwaIcons.ts
 *
 * Перегенерировать при смене палитры/мотива. Payload тут не используется.
 *
 * Набор:
 *   icon-192.png / icon-512.png          — purpose: any (золотая кромка)
 *   icon-maskable-512.png                — purpose: maskable (full-bleed фон,
 *                                          мотив в safe-zone, без кромки у краёв)
 *   apple-touch-icon.png (180×180)       — iOS «добавить на экран»
 */
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import sharp from 'sharp'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(dirname, '../../public/icons')

// Тюльпан-мотив (тот же, что в og.jpg), центрируется через transform.
const tulip = (scale: number) => `
  <g fill="none" stroke="#e8b53a" stroke-width="${12 / scale}" stroke-linecap="round"
     transform="translate(256,300) scale(${scale})">
    <path d="M0 86 V26"/>
    <path d="M0 26 C-48 26 -74 -32 -66 -74 C-32 -40 -14 -40 0 -62 C14 -40 32 -40 66 -74 C74 -32 48 26 0 26 Z"/>
  </g>`

// purpose: any — золотая кромка-рамка по краю.
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#155c39"/>
      <stop offset="0.55" stop-color="#1f7a4d"/>
      <stop offset="1" stop-color="#7a1f2b"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <rect x="28" y="28" width="456" height="456" rx="72" fill="none" stroke="#e8b53a" stroke-width="10"/>
  ${tulip(1.55)}
</svg>`

// purpose: maskable — фон full-bleed (без скруглений/кромки), мотив в центральной
// safe-zone (~60% площади), чтобы маска ОС не срезала.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#155c39"/>
      <stop offset="0.55" stop-color="#1f7a4d"/>
      <stop offset="1" stop-color="#7a1f2b"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg2)"/>
  ${tulip(1.15)}
</svg>`

await fs.mkdir(outDir, { recursive: true })

async function png(svg: string, size: number, name: string) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  await fs.writeFile(path.join(outDir, name), buf)
  console.log(`${name}: ${buf.length} байт`)
}

await png(anySvg, 192, 'icon-192.png')
await png(anySvg, 512, 'icon-512.png')
await png(maskableSvg, 512, 'icon-maskable-512.png')
await png(anySvg, 180, 'apple-touch-icon.png')

console.log(`Иконки записаны в ${outDir}`)
process.exit(0)
