/**
 * Генерация картинок расписания автобусов «Калинино — РМЗ (Сабантуй)» на
 * 4 июля 2026 (данные — с графика АТП, фото от владельца 2026-07-03).
 *
 *   node scripts/gen-bus-schedule.mjs
 *
 * Рисует брендовые таблицы (зелёный/золото, как genOgImage) SVG→JPG:
 *   src/seed/assets/bus/bus-1-vyezd.jpg — 1-й выезд (утро)
 *   src/seed/assets/bus/bus-2-vyezd.jpg — 2-й выезд (день/вечер)
 *   src/seed/assets/bus/bus-cover.jpg   — обложка поста (баннер 1200×630)
 * Кириллица растеризуется системным шрифтом (паттерн genOgImage).
 */
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import sharp from 'sharp'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(dirname, '../src/seed/assets/bus')

const STOPS = ['Пост ГАИ', 'Калинино', 'АТП', 'Центр', 'Чехова', 'РМЗ', 'Чехова', 'Центр', 'АТП', 'Калинино', 'Пост ГАИ']

// Времена — строго по графику АТП. Суффиксы в/н = посадка «верх»/«низ» у РМЗ.
const TRIPS1 = [
  ['', '', '', '', '', '', '', '', '6:57', '7:02', '7:05'],
  ['7:06', '7:09', '7:14', '7:21', '7:27', '7:37н', '7:45', '7:51', '7:59', '8:04', '8:07'],
  ['8:08', '8:11', '8:16', '8:23', '8:29', '8:39в', '8:47', '8:53', '9:01', '9:06', '9:09'],
  ['9:10', '9:13', '9:18', '9:25', '9:31', '9:41н', '9:49', '9:55', '10:03', '10:08', '10:11'],
  ['10:12', '10:15', '10:20', '10:27', '10:33', '10:43в', '10:51', '10:57', '11:05', '11:10', '11:13'],
  ['11:14', '11:17', '11:22', '11:29', '11:35', '11:45в', '11:53', '11:59', '12:07', '12:12', '12:15'],
  ['12:16', '12:19', '12:24', '12:31', '12:37', '12:47н', '12:55', '13:01', '13:09', '13:14', '13:17'],
  ['13:18', '13:21', '13:26', '', '', '', '', '', '', '', ''],
]
const TRIPS2 = [
  ['', '', '13:26', '13:29', '13:32', '13:40в', '13:46', '13:52', '14:00', '14:05', '14:08'],
  ['14:09', '14:12', '14:17', '14:24', '14:30', '14:40н', '14:48', '14:54', '15:02', '15:07', '15:10'],
  ['15:11', '15:14', '15:19', '15:25', '15:30', '', '15:30', '15:36', '15:44', '15:49', '15:52'],
  ['15:53', '15:56', '16:01', '16:08', '16:14', '16:29в', '16:32', '16:38', '16:46', '16:51', '16:54'],
  ['16:55', '16:58', '17:03', '17:06', '17:12', '17:33н', '17:34', '17:40', '17:48', '', ''],
]

const GREEN = '#155c39'
const GREEN_DARK = '#0e4229'
const GOLD = '#e8b53a'
const CREAM = '#fdf9ef'
const ROW_ALT = '#f3ecd9'
const INK = '#1d2a22'
const RED = '#b3372f'

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function tableSvg(title, trips) {
  const M = 36 // внешний отступ
  const colW = 134
  const rmzW = 172
  const cols = STOPS.map((_, i) => (i === 5 ? rmzW : colW))
  const tableW = cols.reduce((a, b) => a + b, 0)
  const W = tableW + M * 2
  const x0 = M
  const xs = [] // левые границы колонок
  let acc = x0
  for (const w of cols) {
    xs.push(acc)
    acc += w
  }
  const headTop = 116
  const groupH = 46
  const headH = 56
  const rowH = 56
  const bodyTop = headTop + groupH + headH
  const legendH = 96
  const H = bodyTop + trips.length * rowH + legendH + M

  const rmzX = xs[5]
  const parts = []

  parts.push(`<rect width="${W}" height="${H}" fill="${CREAM}"/>`)
  // золотая рамка
  parts.push(`<rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="${GOLD}" stroke-width="4" rx="16"/>`)
  // заголовок + тюльпан
  parts.push(`<g fill="none" stroke="${GOLD}" stroke-width="3.4" stroke-linecap="round" transform="translate(${W / 2},58)">
    <path d="M0 26 V8"/><path d="M0 8 C -12 4 -15 -12 -9 -20 C -5 -13 -2 -11 0 -10 C 2 -11 5 -13 9 -20 C 15 -12 12 4 0 8 Z"/>
  </g>`)
  parts.push(`<text x="${W / 2}" y="102" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="bold" fill="${GREEN_DARK}">${esc(title)}</text>`)

  // группы направлений
  const gTo = { x: xs[0], w: xs[5] + rmzW - xs[0] }
  const gBack = { x: xs[6], w: xs[10] + colW - xs[6] }
  parts.push(`<rect x="${gTo.x}" y="${headTop}" width="${gTo.w}" height="${groupH}" fill="${GREEN}"/>`)
  parts.push(`<rect x="${gBack.x}" y="${headTop}" width="${gBack.w}" height="${groupH}" fill="${GREEN_DARK}"/>`)
  parts.push(`<text x="${gTo.x + gTo.w / 2}" y="${headTop + 31}" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#fff">→  НА САБАНТУЙ (к майдану у РМЗ)</text>`)
  parts.push(`<text x="${gBack.x + gBack.w / 2}" y="${headTop + 31}" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#fff">←  ОБРАТНО</text>`)

  // шапка остановок
  for (let i = 0; i < STOPS.length; i++) {
    const fill = i === 5 ? GOLD : i < 5 ? GREEN : GREEN_DARK
    const tfill = i === 5 ? GREEN_DARK : '#fff'
    parts.push(`<rect x="${xs[i]}" y="${headTop + groupH}" width="${cols[i]}" height="${headH}" fill="${fill}" stroke="#ffffff" stroke-opacity="0.25"/>`)
    parts.push(`<text x="${xs[i] + cols[i] / 2}" y="${headTop + groupH + 35}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${i === 5 ? 24 : 20}" font-weight="bold" fill="${tfill}">${esc(STOPS[i])}</text>`)
  }

  // строки
  trips.forEach((row, r) => {
    const y = bodyTop + r * rowH
    parts.push(`<rect x="${x0}" y="${y}" width="${tableW}" height="${rowH}" fill="${r % 2 ? ROW_ALT : CREAM}"/>`)
    // подсветка колонки РМЗ
    parts.push(`<rect x="${rmzX}" y="${y}" width="${rmzW}" height="${rowH}" fill="${GOLD}" fill-opacity="0.16"/>`)
    row.forEach((cell, i) => {
      if (!cell) return
      const cx = xs[i] + cols[i] / 2
      const m = cell.match(/^(\d{1,2}:\d{2})(в|н)?$/)
      const time = m ? m[1] : cell
      const mark = m && m[2] ? (m[2] === 'в' ? 'верх' : 'низ') : null
      if (mark) {
        parts.push(`<text x="${cx}" y="${y + 27}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${GREEN_DARK}">${time}</text>`)
        parts.push(`<text x="${cx}" y="${y + 47}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${RED}">${mark}</text>`)
      } else {
        parts.push(`<text x="${cx}" y="${y + 36}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" ${i === 0 || i === 10 ? `font-weight="bold" fill="${GREEN}"` : `fill="${INK}"`}>${time}</text>`)
      }
    })
  })

  // сетка
  const bodyH = trips.length * rowH
  for (let i = 0; i <= STOPS.length; i++) {
    const x = i === STOPS.length ? xs[10] + colW : xs[i]
    parts.push(`<line x1="${x}" y1="${headTop}" x2="${x}" y2="${bodyTop + bodyH}" stroke="${GREEN}" stroke-opacity="0.28"/>`)
  }
  for (let r = 0; r <= trips.length; r++) {
    const y = bodyTop + r * rowH
    parts.push(`<line x1="${x0}" y1="${y}" x2="${x0 + tableW}" y2="${y}" stroke="${GREEN}" stroke-opacity="0.28"/>`)
  }
  parts.push(`<rect x="${x0}" y="${headTop}" width="${tableW}" height="${groupH + headH + bodyH}" fill="none" stroke="${GREEN}" stroke-width="2.5"/>`)

  // легенда
  const ly = bodyTop + bodyH + 40
  parts.push(`<text x="${x0}" y="${ly}" font-family="Arial, sans-serif" font-size="20" fill="${INK}"><tspan font-weight="bold" fill="${RED}">верх / низ</tspan> — посадка и высадка на верхней или нижней площадке у РМЗ (майдана).</text>`)
  parts.push(`<text x="${x0}" y="${ly + 32}" font-family="Arial, sans-serif" font-size="20" fill="${INK}">Время московское. График движения АТП на 4 июля 2026 года.</text>`)

  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join('\n')}</svg>`, W, H }
}

async function renderTable(file, title, trips) {
  const { svg } = tableSvg(title, trips)
  await sharp(Buffer.from(svg), { density: 144 }).jpeg({ quality: 90 }).toFile(path.join(outDir, file))
  console.log(`✓ ${file}`)
}

async function renderCover() {
  const bg = path.resolve(dirname, '../public/decor/page-maydan-lg.webp')
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0c3a24" stop-opacity="0.6"/>
      <stop offset="0.5" stop-color="#0a3221" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#072618" stop-opacity="0.78"/>
    </linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#08160d" flood-opacity="0.85"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#veil)"/>
  <rect x="26" y="26" width="1148" height="578" fill="none" stroke="${GOLD}" stroke-width="6" rx="20"/>
  <text x="600" y="205" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="#ffffff" filter="url(#sh)">🚌 Автобусы на Сабантуй</text>
  <text x="600" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-weight="bold" fill="${GOLD}" filter="url(#sh)">4 июля 2026</text>
  <text x="600" y="385" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="#ffffff" filter="url(#sh)">маршрут Калинино — РМЗ (майдан)</text>
  <text x="600" y="465" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#f3e6c2" filter="url(#sh)">Пост ГАИ · Калинино · АТП · Центр · Чехова · РМЗ</text>
</svg>`
  await sharp(bg)
    .resize(1200, 630, { fit: 'cover' })
    .composite([{ input: Buffer.from(overlay) }])
    .jpeg({ quality: 88 })
    .toFile(path.join(outDir, 'bus-cover.jpg'))
  console.log('✓ bus-cover.jpg')
}

await fs.mkdir(outDir, { recursive: true })
await renderTable('bus-1-vyezd.jpg', 'Расписание автобусов · 4 июля · 1-й выезд (утро)', TRIPS1)
await renderTable('bus-2-vyezd.jpg', 'Расписание автобусов · 4 июля · 2-й выезд (день и вечер)', TRIPS2)
await renderCover()
console.log('Готово →', outDir)
