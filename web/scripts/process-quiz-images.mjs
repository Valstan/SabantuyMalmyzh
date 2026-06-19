// Конвейер картинок игры «Угадай по картинке» (game=kartinki).
// Качаем СВОБОДНЫЕ изображения с Wikimedia Commons (CC0/CC-BY/CC-BY-SA/PD),
// ресайзим (sharp) и кладём в web/public/quiz/<slug>.{jpg,webp} (коммитятся в git,
// как декор). Источник/лицензия каждой картинки — в манифесте ниже И в seedQuizImages.ts
// (поле imageSource = страница File: на Commons, атрибуция). Перезапуск идемпотентен.
//
//   node web/scripts/process-quiz-images.mjs
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const dir = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(dir, '../public/quiz')
const WIDTH = 900 // отображается до ~360px по высоте; 900px хватает на ретину

// slug → прямой URL файла на Commons + страница (атрибуция) + лицензия/автор.
export const QUIZ_IMAGES = [
  { slug: 'koresh', url: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Kurash_on_Moscow_Sabantuy_of_Moscow_bashkirs.jpg', page: 'https://commons.wikimedia.org/wiki/File:Kurash_on_Moscow_Sabantuy_of_Moscow_bashkirs.jpg', lic: 'CC BY-SA 4.0', by: 'IlshatS' },
  { slug: 'chakchak', url: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Chak-chak-made_02.jpg', page: 'https://commons.wikimedia.org/wiki/File:Chak-chak-made_02.jpg', lic: 'CC BY 4.0', by: 'Pannet' },
  { slug: 'echpochmak', url: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Echpochmak2.jpg', page: 'https://commons.wikimedia.org/wiki/File:Echpochmak2.jpg', lic: 'CC BY-SA 3.0', by: 'Qweasdqwe' },
  { slug: 'sabantuy-dance', url: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Tatar_dance_at_the_Sabantuy_festival%2C_Kirov.jpg', page: 'https://commons.wikimedia.org/wiki/File:Tatar_dance_at_the_Sabantuy_festival,_Kirov.jpg', lic: 'CC BY-SA 4.0', by: 'Ele-chudinovsk' },
  { slug: 'sabantuy-game', url: 'https://upload.wikimedia.org/wikipedia/commons/8/80/%D0%98%D0%B3%D1%80%D0%B0_%D0%BD%D0%B0_%D0%A1%D0%B0%D0%B1%D0%B0%D0%BD%D1%82%D1%83%D0%B5.jpg', page: 'https://commons.wikimedia.org/wiki/File:%D0%98%D0%B3%D1%80%D0%B0_%D0%BD%D0%B0_%D0%A1%D0%B0%D0%B1%D0%B0%D0%BD%D1%82%D1%83%D0%B5.jpg', lic: 'CC BY-SA 4.0', by: 'Игорь Улитин' },
  { slug: 'vyatka', url: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Bridge_over_Vyatka_river._Kirov._Russia._%D0%9C%D0%BE%D1%81%D1%82_%D1%87%D0%B5%D1%80%D0%B5%D0%B7_%D0%92%D1%8F%D1%82%D0%BA%D1%83._%D0%9A%D0%B8%D1%80%D0%BE%D0%B2._%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F_-_panoramio.jpg', page: 'https://commons.wikimedia.org/wiki/File:Bridge_over_Vyatka_river._Kirov._Russia._-_panoramio.jpg', lic: 'CC BY 3.0', by: 'kikiwis' },
  { slug: 'malmyzh', url: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Epiphany_Cathedral_in_Malmyzh%2C_Kirov_Oblast.jpg', page: 'https://commons.wikimedia.org/wiki/File:Epiphany_Cathedral_in_Malmyzh,_Kirov_Oblast.jpg', lic: 'CC BY-SA 4.0', by: 'Alx0yago' },
  { slug: 'tatar-costume', url: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Nafiga_Arapova_in_tatar_costume.jpg', page: 'https://commons.wikimedia.org/wiki/File:Nafiga_Arapova_in_tatar_costume.jpg', lic: 'Public domain', by: 'Unknown' },
]

async function run() {
  await mkdir(OUT, { recursive: true })
  for (const img of QUIZ_IMAGES) {
    const res = await fetch(img.url, { headers: { 'User-Agent': 'SabantuyMalmyzhBot/1.0 (educational quiz; contact via site)' } })
    if (!res.ok) {
      console.error(`✗ ${img.slug}: HTTP ${res.status}`)
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const base = sharp(buf).rotate().resize({ width: WIDTH, withoutEnlargement: true })
    await base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(OUT, `${img.slug}.jpg`))
    await base.clone().webp({ quality: 80 }).toFile(path.join(OUT, `${img.slug}.webp`))
    console.log(`✓ ${img.slug}  [${img.lic}]`)
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
