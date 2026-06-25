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
  // 2026-06-24: калфак переснят крупным планом (старый tatar-costume — мелкий ч/б
  // портрет, убор не читался) + добавлены тюбетейка (пара к калфаку) и гармонь.
  { slug: 'kalfak', url: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Kalfak_1_%282024-02-06%29_01.jpg', page: 'https://commons.wikimedia.org/wiki/File:Kalfak_1_(2024-02-06)_01.jpg', lic: 'CC BY-SA 4.0', by: 'Vyacheslav Kirillin' },
  { slug: 'tubeteika', url: 'https://upload.wikimedia.org/wikipedia/commons/b/be/%D0%A2%D1%8E%D0%B1%D0%B5%D1%82%D0%B5%D0%B9%D0%BA%D0%B0_-_%D0%BC%D1%83%D0%B6%D1%81%D0%BA%D0%BE%D0%B9_%D0%B3%D0%BE%D0%BB%D0%BE%D0%B2%D0%BD%D0%BE%D0%B9_%D1%83%D0%B1%D0%BE%D1%80_-_%D1%82%D0%B0%D1%82%D0%B0%D1%80%D1%8B_-_%D0%BD%D0%B0%D1%87_20_%D0%B2.jpg', page: 'https://commons.wikimedia.org/wiki/File:%D0%A2%D1%8E%D0%B1%D0%B5%D1%82%D0%B5%D0%B9%D0%BA%D0%B0_-_%D0%BC%D1%83%D0%B6%D1%81%D0%BA%D0%BE%D0%B9_%D0%B3%D0%BE%D0%BB%D0%BE%D0%B2%D0%BD%D0%BE%D0%B9_%D1%83%D0%B1%D0%BE%D1%80_-_%D1%82%D0%B0%D1%82%D0%B0%D1%80%D1%8B_-_%D0%BD%D0%B0%D1%87_20_%D0%B2.jpg', lic: 'CC0', by: 'Александр Сигачёв' },
  { slug: 'garmon', url: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Garmon_Talianka_6.jpg', page: 'https://commons.wikimedia.org/wiki/File:Garmon_Talianka_6.jpg', lic: 'Public domain', by: 'Sergeev Pavel' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Вежливо к Commons: задержка между запросами + ретрай с backoff на 429/5xx
// (без этого пачка запросов ловит HTTP 429 Too Many Requests).
async function fetchWithRetry(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'SabantuyMalmyzhBot/1.0 (educational quiz; contact via site)' } })
    if (res.ok) return res
    if (res.status === 429 || res.status >= 500) {
      const wait = 2000 * (i + 1)
      console.error(`  ${res.status} — повтор через ${wait}мс …`)
      await sleep(wait)
      continue
    }
    return res // не-ретраибл (4xx кроме 429)
  }
  return null
}

async function run() {
  await mkdir(OUT, { recursive: true })
  for (const img of QUIZ_IMAGES) {
    const res = await fetchWithRetry(img.url)
    if (!res || !res.ok) {
      console.error(`✗ ${img.slug}: HTTP ${res ? res.status : 'нет ответа'}`)
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const base = sharp(buf).rotate().resize({ width: WIDTH, withoutEnlargement: true })
    await base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(OUT, `${img.slug}.jpg`))
    await base.clone().webp({ quality: 80 }).toFile(path.join(OUT, `${img.slug}.webp`))
    console.log(`✓ ${img.slug}  [${img.lic}]`)
    await sleep(1200) // пауза между файлами — не злим rate-limit Commons
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
