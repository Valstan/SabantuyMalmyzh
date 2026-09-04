#!/usr/bin/env node
// Гейт D-038: recon-литералы в отслеживаемых файлах публичного репозитория.
//
// Ищет ПО ФОРМЕ, а не по значению (#191: denylist с настоящими значениями публикует
// то, что запрещает). Baseline тоже без значений — только «файл × класс × сколько».
//
// Красный — на НОВОМ вхождении, не на существующем: сознательно оставленные места
// (корень развёртывания в воркфлоу, константа клиента vault) записаны в baseline с
// причиной. Изменилось число — значит появилось то, чего никто не решал оставить.
//
// Приёмка метода (#262): перед сравнением гейт обязан найти заведомо присутствующие
// образцы и НЕ найти заведомо безобидные. Пустой скан — это сломанный скан, а не
// чистый репозиторий.
//
// Запуск: node .github/scripts/recon-scan.mjs [--update-baseline]

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const BASELINE = '.github/recon-baseline.json'
const SEP = '\u0000' // razdelitel klyucha 'fayl + klass': v putyah ne vstrechaetsya
const SELF = ['.github/scripts/recon-scan.mjs', BASELINE]

/** Классы. `re` — форма; `skip` — заведомо публичное или структурно безопасное. */
const CLASSES = [
  {
    id: 'fs-home',
    what: 'абсолютный путь под домашним каталогом пользователя',
    re: /(?<![\w<])\/home\/[a-z_][a-z0-9_-]*/gi,
  },
  {
    id: 'fs-etc-project',
    what: 'каталог конфигурации сервиса под /etc',
    re: /(?<![\w<])\/etc\/[a-z_][a-z0-9_.-]*/gi,
    skip: (m) =>
      /^\/etc\/(systemd|nginx|hosts|passwd|shadow|ssl|cron|apt|default|environment|letsencrypt)\b/i.test(m),
  },
  {
    id: 'fs-srv-opt-var',
    what: 'абсолютный путь развёртывания под /srv, /opt, /var',
    re: /(?<![\w<])\/(?:srv|opt|var)\/[a-z_][a-z0-9_.-]*/gi,
    skip: (m) => /^\/var\/(log|run|lib|tmp|cache|spool)\b/i.test(m),
  },
  {
    id: 'host-hex-subdomain',
    what: 'хост вида <hex>.<метка>.<домен> — форма адреса бокса у провайдеров',
    re: /\b[a-f0-9]{8,}\.[a-z0-9-]+(?:\.[a-z0-9-]+)+\.[a-z]{2,}\b/gi,
  },
  {
    id: 'host-vps-vds',
    what: 'хост с меткой vps/vds в имени',
    re: /\b[a-z0-9-]+\.(?:vps|vds)\.[a-z0-9.-]+\.[a-z]{2,}\b/gi,
  },
  {
    id: 'ip-public',
    what: 'публичный IPv4-литерал',
    re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    skip: (m) => {
      const o = m.split('.').map(Number)
      if (o.some((x) => x > 255)) return true // версия, а не адрес
      const [a, b] = o
      return (
        a === 10 ||
        a === 127 ||
        a === 0 ||
        a >= 224 ||
        (a === 192 && b === 168) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 169 && b === 254)
      )
    },
  },
  {
    id: 'systemd-real-value',
    what: 'поле systemd-юнита с настоящим значением вместо плейсхолдера',
    re: /^(?:User|Group|WorkingDirectory|EnvironmentFile)=(?!<)\S+$/gim,
    skip: (m) => /=(?:root|nobody|www-data)$/i.test(m),
  },
]

/** Положительный контроль: каждая строка ОБЯЗАНА совпасть со своим классом (#262). */
const POSITIVE = [
  ['fs-home', '/home/deployuser/app'],
  ['fs-etc-project', 'EnvironmentFile=/etc/someservice/x.env'],
  ['fs-srv-opt-var', '/srv/someapp/current'],
  ['host-hex-subdomain', 'https://0123456789ab.vps.example.ru/api'],
  ['host-vps-vds', 'https://somebox.vps.example.ru/'],
  ['ip-public', '203.0.113.7'],
  ['systemd-real-value', 'EnvironmentFile=/etc/someservice/x.env'],
]

/** Отрицательный контроль: не должно ловиться ни одним классом. */
const NEGATIVE = [
  '127.0.0.1',
  '10.1.2.3',
  '192.168.0.1',
  '172.16.5.4',
  'corepack pnpm@10.15.0',
  'Payload CMS 3.75.0',
  'EnvironmentFile=<путь-к-env-файлу-сервиса>',
  'User=<пользователь-сервиса>',
  '/etc/systemd/system/app.service',
  '/var/log/nginx/access.log',
]

function hits(c, text) {
  return [...text.matchAll(new RegExp(c.re.source, c.re.flags))]
    .map((m) => m[0])
    .filter((m) => !(c.skip && c.skip(m)))
}

function selfTest() {
  const bad = []
  for (const [id, sample] of POSITIVE) {
    const c = CLASSES.find((x) => x.id === id)
    if (hits(c, sample).length === 0) bad.push(`${id}: не сработал на заведомом образце`)
  }
  for (const sample of NEGATIVE) {
    for (const c of CLASSES) {
      if (hits(c, sample).length) bad.push(`${c.id}: поймал безобидное «${sample}»`)
    }
  }
  return bad
}

function scan() {
  const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
  const found = new Map()
  const binaries = []
  for (const f of files) {
    if (SELF.includes(f)) continue
    let text
    try {
      text = readFileSync(f, 'utf8')
    } catch {
      continue
    }
    if (text.includes('\u0000')) {
      binaries.push(f)
      continue
    }
    for (const c of CLASSES) {
      const n = hits(c, text).length
      if (n) found.set(f + SEP + c.id, n)
    }
  }
  return { found, binaries }
}

const controlFailures = selfTest()
if (controlFailures.length) {
  console.log('::error::контроль метода не прошёл — скан ничего не доказывает')
  for (const b of controlFailures) console.log(`::error::${b}`)
  process.exit(1)
}
console.log(
  `контроль метода пройден: ${POSITIVE.length} положительных образцов, ${NEGATIVE.length} отрицательных`,
)

const { found, binaries } = scan()
console.log(
  `бинарных файлов пропущено осознанно: ${binaries.length} — текстовый поиск их не видит, это отдельный класс (docs/GOTCHAS.md)`,
)

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : { accepted: [] }
const accepted = new Map(baseline.accepted.map((e) => [e.file + SEP + e.class, e.count]))

if (process.argv.includes('--update-baseline')) {
  const entries = [...found.entries()]
    .map(([k, count]) => {
      const [file, cls] = k.split(SEP)
      const prev = baseline.accepted.find((e) => e.file === file && e.class === cls)
      return { file, class: cls, count, reason: prev?.reason ?? 'ТРЕБУЕТ ПРИЧИНЫ' }
    })
    .sort((a, b) => (a.file + a.class).localeCompare(b.file + b.class))
  writeFileSync(BASELINE, JSON.stringify({ accepted: entries }, null, 2) + '\n', 'utf8')
  console.log(`baseline перезаписан: ${entries.length} записей`)
  process.exit(0)
}

const meta = Object.fromEntries(CLASSES.map((c) => [c.id, c.what]))
const problems = []
for (const [k, count] of found) {
  const [file, cls] = k.split(SEP)
  const was = accepted.get(k)
  if (was === undefined) problems.push({ file, cls, kind: 'файл раньше в этом классе не значился' })
  else if (count > was) problems.push({ file, cls, kind: `вхождений стало больше (${was} → ${count})` })
}
for (const p of problems) {
  console.log(
    `::error file=${p.file}::recon-литерал — ${meta[p.cls]} (${p.cls}): ${p.kind}. ` +
      `Убрать значение из отслеживаемого файла (D-038); если оно load-bearing — внести в ` +
      `${BASELINE} с причиной: node .github/scripts/recon-scan.mjs --update-baseline`,
  )
}
for (const k of [...accepted.keys()].filter((x) => !found.has(x))) {
  const [file, cls] = k.split(SEP)
  console.log(`::warning file=${file}::запись baseline устарела (${cls}) — вхождений больше нет, строку можно снять`)
}
console.log(`классов: ${CLASSES.length}; мест в baseline: ${accepted.size}; новых: ${problems.length}`)
process.exit(problems.length ? 1 : 0)
