// Добавляет origin нового домена в CORS бакета Object Storage, НИЧЕГО не ломая в
// существующих правилах (аддитивно). Нужно, чтобы загрузка фото/видео (presigned PUT
// браузер→S3) работала с нового домена — иначе CORS-preflight его Origin не пропустит
// (ровно та punycode-грабля, что ловили с apex домена ранее).
//
// Безопасность ключей: S3_* читаются из STDIN (раннер пайпит их из /etc/sabantuy/
// sabantuy.env по SSH), сами значения никогда не печатаются. На экран — только origins.
//
// Запуск: ssh box 'grep ^S3_ env' | node web/scripts/update-s3-cors.mjs <inspect|apply> <newOrigin>

import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const mode = process.argv[2] === 'apply' ? 'apply' : 'inspect'
const newOrigin = (process.argv[3] || '').trim().replace(/\/+$/, '')

if (mode === 'apply' && !/^https:\/\/[a-z0-9.-]+$/i.test(newOrigin)) {
  console.error(`Некорректный origin: "${newOrigin}" (ожидался https://host)`)
  process.exit(1)
}

// --- креды из stdin (S3_KEY=value), значения не логируем ---
const raw = await new Promise((res) => {
  let buf = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (c) => (buf += c))
  process.stdin.on('end', () => res(buf))
})
const env = {}
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^(S3_[A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const ENDPOINT = env.S3_ENDPOINT || 'https://storage.yandexcloud.net'
const REGION = env.S3_REGION || 'ru-central1'
const BUCKET = env.S3_BUCKET || ''
const ACCESS_KEY_ID = env.S3_ACCESS_KEY_ID || ''
const SECRET_ACCESS_KEY = env.S3_SECRET_ACCESS_KEY || ''

if (!BUCKET || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error('Нет обязательных S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY в stdin.')
  process.exit(1)
}
console.log(`bucket=${BUCKET} endpoint=${ENDPOINT} region=${REGION}`)

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  forcePathStyle: true,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
})

function printRules(rules) {
  rules.forEach((r, i) => {
    console.log(`  rule#${i}: origins=${JSON.stringify(r.AllowedOrigins)} methods=${JSON.stringify(r.AllowedMethods)}`)
  })
}

let rules = []
try {
  const cur = await s3.send(new GetBucketCorsCommand({ Bucket: BUCKET }))
  rules = cur.CORSRules || []
} catch (e) {
  if (e?.name === 'NoSuchCORSConfiguration') console.log('CORS пока не задан (создам с нуля при apply).')
  else throw e
}

console.log(`== текущий CORS (${rules.length} правил) ==`)
printRules(rules)

if (mode === 'inspect') {
  console.log('inspect: изменений не вношу.')
  process.exit(0)
}

// apply: добавить newOrigin в AllowedOrigins каждого правила (где его нет). Если правил
// нет — создать одно разумное (PUT/GET/HEAD, заголовки *, ETag наружу).
let changed = false
if (rules.length === 0) {
  rules = [
    {
      AllowedOrigins: [newOrigin],
      AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600,
    },
  ]
  changed = true
} else {
  for (const r of rules) {
    r.AllowedOrigins = r.AllowedOrigins || []
    if (!r.AllowedOrigins.includes(newOrigin)) {
      r.AllowedOrigins.push(newOrigin)
      changed = true
    }
  }
}

if (!changed) {
  console.log(`origin ${newOrigin} уже разрешён во всех правилах — нечего менять.`)
  process.exit(0)
}

await s3.send(
  new PutBucketCorsCommand({ Bucket: BUCKET, CORSConfiguration: { CORSRules: rules } }),
)
console.log(`✅ добавлен origin ${newOrigin}. Перечитываю…`)
const after = (await s3.send(new GetBucketCorsCommand({ Bucket: BUCKET }))).CORSRules || []
console.log(`== CORS после (${after.length} правил) ==`)
printRules(after)
