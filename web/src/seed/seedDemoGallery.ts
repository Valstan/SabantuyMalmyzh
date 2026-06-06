/**
 * DEV-ONLY: демо-альбом галереи с плейсхолдер-фото для локального превью вёрстки
 * (masonry-фотостена + лайтбокс). Старый WP-источник реальных фото больше
 * недоступен (домен отдаёт новый сайт), поэтому для разработки генерируем
 * placeholder-картинки разной высоты — чтобы видеть masonry-эффект.
 *
 *   corepack pnpm -C web payload run src/seed/seedDemoGallery.ts
 *
 * На проде НЕ запускается (гейт NODE_ENV) и реальный контент не трогает.
 * Идемпотентно: повторный запуск пропускает существующий альбом (SEED_FORCE=1 —
 * пересоздать).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- seed-утилита: Payload data untyped */
import config from '@payload-config'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import { getPayload } from 'payload'

const SLUG = 'demo-foto'
const HEIGHTS = [560, 760, 640, 900, 600, 820, 700, 580, 880]
const COLORS = ['#155c39', '#b0263c', '#e8b53a', '#7a1f2b', '#1f7a4d', '#c9772a']

const payload = await getPayload({ config })
const log = (...a: unknown[]) => payload.logger.info(a.map(String).join(' '))

if (process.env.NODE_ENV === 'production') {
  log('NODE_ENV=production → демо-галерея не создаётся (только для dev).')
  process.exit(0)
}

const force = process.env.SEED_FORCE === '1'
const existing = await payload.find({
  collection: 'gallery',
  where: { slug: { equals: SLUG } },
  limit: 1,
  overrideAccess: true,
})
if (existing.totalDocs > 0 && !force) {
  log(`= демо-альбом «${SLUG}» уже есть — пропуск (SEED_FORCE=1 чтобы пересоздать)`)
  process.exit(0)
}
if (existing.totalDocs > 0 && force) {
  await payload.delete({ collection: 'gallery', id: existing.docs[0].id, overrideAccess: true })
  log('↻ старый демо-альбом удалён (SEED_FORCE)')
}

async function makePhoto(i: number): Promise<number> {
  const w = 800
  const h = HEIGHTS[i % HEIGHTS.length]
  const bg = COLORS[i % COLORS.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="46%" font-family="Georgia, serif" font-size="150" fill="rgba(255,255,255,0.92)"
      text-anchor="middle" dominant-baseline="middle">${i + 1}</text>
    <text x="50%" y="62%" font-family="Arial, sans-serif" font-size="34" fill="rgba(255,255,255,0.8)"
      text-anchor="middle" dominant-baseline="middle">демо-фото ${w}×${h}</text>
  </svg>`
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer()
  const file = path.join(os.tmpdir(), `demo-foto-${i + 1}-${Math.round(performance.now())}.jpg`)
  await fs.writeFile(file, buf)
  const doc = await payload.create({
    collection: 'media',
    data: { alt: `Демо-фото ${i + 1}` } as any,
    filePath: file,
    overrideAccess: true,
  })
  await fs.unlink(file).catch(() => {})
  return doc.id as number
}

const photoIds: number[] = []
for (let i = 0; i < 9; i++) {
  photoIds.push(await makePhoto(i))
  log(`  ↳ демо-фото ${i + 1}/9`)
}

await payload.create({
  collection: 'gallery',
  data: {
    title: 'Демо-альбом (превью вёрстки)',
    slug: SLUG,
    description: 'Технический альбом с плейсхолдер-фото для проверки masonry-сетки и лайтбокса. На проде не создаётся.',
    date: '2026-06-06T00:00:00.000Z',
    publishedAt: '2026-06-06T00:00:00.000Z',
    _status: 'published',
    coverImage: photoIds[0],
    photos: photoIds.map((id, i) => ({ image: id, caption: i % 2 === 0 ? `Кадр №${i + 1}` : undefined })),
  } as any,
  overrideAccess: true,
})

log(`✓ демо-альбом «${SLUG}» создан — ${photoIds.length} фото (/gallery/${SLUG})`)
process.exit(0)
