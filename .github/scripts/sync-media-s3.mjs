// Однократная синхронизация shared/media → Object Storage перед подключением
// адаптера @payloadcms/storage-s3 (ADR-0001). Идемпотентна: объект с тем же
// ключом и размером пропускается, поэтому прогон можно повторять.
//
// Порядок миграции жёсткий: СНАЧАЛА этот скрипт (файлы лежат в бакете),
// ПОТОМ мерж адаптера (url переключается на S3). Наоборот — битые картинки
// на живом сайте до конца синхронизации.
//
// Ключ объекта = имя файла как есть: адаптер без prefix строит url как
// endpoint/bucket/<filename> — ровно так же (проверено по generateURL.js 3.75.0).
//
// Безопасность ключей: S3_* читаются из STDIN (воркфлоу пайпит их из env-файла
// сервиса по SSH), значения никогда не печатаются. На экран — счётчики и
// первые имена файлов. Логи прогонов публичны.
//
// Запуск (на боксе): grep '^S3_' <env> | WEB_DIR=<repo>/web node sync-media-s3.mjs <mediaDir> [--apply] [--sample N]
import { createRequire } from 'node:module'
import { readdir, stat, readFile } from 'node:fs/promises'
import path from 'node:path'

// ESM игнорирует NODE_PATH; зависимости берём из web/node_modules через require —
// с pnpm-симлинками это работает, а скрипт может лежать вне web/.
const require = createRequire(path.join(process.env.WEB_DIR || process.cwd(), 'package.json'))
const { S3Client, HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3')

const mediaDir = process.argv[2]
const apply = process.argv.includes('--apply')
const sampleIdx = process.argv.indexOf('--sample')
const sampleN = sampleIdx > -1 ? Number(process.argv[sampleIdx + 1]) || 3 : 3
if (!mediaDir) {
  console.error('нужен путь к каталогу media')
  process.exit(2)
}

// --- креды из stdin ---
const raw = await new Promise((res) => {
  let buf = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (c) => (buf += c))
  process.stdin.on('end', () => res(buf))
})
const env = {}
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^(S3_[A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, '$1')
}
const ENDPOINT = env.S3_ENDPOINT || 'https://storage.yandexcloud.net'
const REGION = env.S3_REGION || 'ru-central1'
const BUCKET = env.S3_BUCKET
if (!BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
  console.error('в stdin нет S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY')
  process.exit(2)
}
const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  forcePathStyle: true,
  credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
})

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif',
}

// Раскладка плоская (probe 01.09), но на всякий случай — только файлы верхнего уровня:
// подкаталоги адаптер не создаёт, и ключи с '/' ему ни к чему.
const names = (await readdir(mediaDir, { withFileTypes: true }))
  .filter((d) => d.isFile() && !d.name.startsWith('.'))
  .map((d) => d.name)
  .sort()

let uploaded = 0, skipped = 0, failed = 0, bytes = 0
const failedNames = []
const CONCURRENCY = 6

async function one(name) {
  const full = path.join(mediaDir, name)
  const st = await stat(full)
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: name }))
    if (Number(head.ContentLength) === st.size) { skipped++; return }
  } catch (e) {
    if (e?.$metadata?.httpStatusCode !== 404 && e?.name !== 'NotFound') throw e
  }
  if (!apply) { uploaded++; bytes += st.size; return }
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: name, Body: await readFile(full),
    ContentType: MIME[path.extname(name).toLowerCase()] || 'application/octet-stream',
    // Как у UGC: бакет public-read, объект читается публичным url без подписи.
    ACL: 'public-read',
  }))
  uploaded++; bytes += st.size
}

const queue = [...names]
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const name = queue.shift()
    try { await one(name) } catch (e) { failed++; failedNames.push(name); console.error(`ОШИБКА ${name}: ${e?.name || e}`) }
  }
}))

console.log(`режим: ${apply ? 'APPLY' : 'DRY-RUN'}  бакет: ${BUCKET}`)
console.log(`файлов в каталоге: ${names.length}`)
console.log(`${apply ? 'загружено' : 'к загрузке'}: ${uploaded} (${(bytes / 1048576).toFixed(1)} МБ)  уже в бакете: ${skipped}  ошибок: ${failed}`)

// Приёмка: публичный GET по тому url, который построит адаптер. Код ответа — факт,
// «загружено» само по себе ≠ «отдаётся» (#110).
if (apply && uploaded + skipped > 0) {
  const sample = names.slice(0, sampleN)
  for (const n of sample) {
    const url = `${ENDPOINT}/${BUCKET}/${encodeURIComponent(n)}`
    const r = await fetch(url, { method: 'HEAD' })
    console.log(`проверка GET ${r.status} ${r.headers.get('content-type') || ''} ${n}`)
  }
}
process.exit(failed ? 1 : 0)
