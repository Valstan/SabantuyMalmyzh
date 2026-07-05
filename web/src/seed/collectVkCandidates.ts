/**
 * Коллектор «Фотостены» (I8): ищет открытые VK-посты о Сабантуе в Малмыже и
 * складывает их фото кандидатами в коллекцию vk-candidates (status=new) на
 * модерацию в /admin. Публикацией НЕ занимается — только сбор (полуавтомат).
 *
 *   VK_SERVICE_TOKEN=... corepack pnpm -C web payload run src/seed/collectVkCandidates.ts
 *
 * Env:
 *   VK_SERVICE_TOKEN — сервисный ключ VK-приложения 54656174 (обязателен;
 *                      на боксе НЕ хранится — workflow collect-vk.yml передаёт
 *                      его из GitHub Secret прямо в env запуска).
 *   VK_QUERIES       — запросы через «;» (дефолт — 4 запроса разведки 04.07).
 *   VK_SINCE         — ISO-дата нижней границы поиска (дефолт: 30 дней назад).
 *
 * Идемпотентно: дедуп по vkKey = `${owner_id}_${post_id}_${photoIndex}` (unique
 * в БД) — повторный прогон те же фото не дублирует, но освежает photoUrl у
 * кандидатов БЕЗ скачанного media (ссылки VK CDN протухают).
 *
 * NB: метод newsfeed.search. Если VK ответит «access denied» на сервисный ключ —
 * нужен пользовательский токен (см. сообщение об ошибке ниже).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- seed-утилита: ответы VK API untyped */
import config from '@payload-config'
import { getPayload } from 'payload'

const log = (m: string) => console.log(m)

const TOKEN = process.env.VK_SERVICE_TOKEN
const QUERIES = (
  process.env.VK_QUERIES || 'Сабантуй Малмыж;Сабантуй в Малмыже;сабантуй малмыжский;Малмыж сабантуй'
)
  .split(';')
  .map((q) => q.trim())
  .filter(Boolean)
const SINCE = process.env.VK_SINCE
  ? Math.floor(new Date(process.env.VK_SINCE).getTime() / 1000)
  : Math.floor(Date.now() / 1000) - 30 * 24 * 3600

const API = 'https://api.vk.com/method'
const V = '5.199'

async function vk(method: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams({ ...params, access_token: TOKEN!, v: V })
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(20_000),
  })
  const json: any = await res.json()
  if (json.error) {
    const { error_code, error_msg } = json.error
    if (error_code === 15 || error_code === 27 || error_code === 30) {
      throw new Error(
        `VK ${method}: ${error_msg} (code ${error_code}). Сервисному ключу метод недоступен — ` +
          `нужен пользовательский токен с правом wall/newsfeed в VK_SERVICE_TOKEN.`,
      )
    }
    throw new Error(`VK ${method}: ${error_msg} (code ${error_code})`)
  }
  return json.response
}

type Candidate = {
  vkKey: string
  photoUrl: string
  postUrl: string
  authorName: string | null
  authorUrl: string | null
  text: string
  foundQuery: string
  vkPublishedAt: string
}

// Имя автора поста из extended-справочников ответа (profiles/groups).
function resolveAuthor(
  ownerId: number,
  profiles: any[],
  groups: any[],
): { name: string | null; url: string | null } {
  if (ownerId < 0) {
    const g = groups.find((x) => x.id === -ownerId)
    return g
      ? { name: g.name, url: `https://vk.com/${g.screen_name || `club${g.id}`}` }
      : { name: null, url: `https://vk.com/club${-ownerId}` }
  }
  const p = profiles.find((x) => x.id === ownerId)
  return p
    ? { name: `${p.first_name} ${p.last_name}`.trim(), url: `https://vk.com/id${p.id}` }
    : { name: null, url: `https://vk.com/id${ownerId}` }
}

// Максимальный по площади размер фото из attachment.
function maxPhotoUrl(photo: any): string | null {
  const sizes: any[] = photo?.sizes || []
  if (!sizes.length) return null
  const best = sizes.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b))
  return best?.url || null
}

async function run() {
  if (!TOKEN) {
    console.error('VK_SERVICE_TOKEN не задан — коллектору нечем ходить в VK API.')
    process.exit(1)
  }

  const found = new Map<string, Candidate>()
  for (const q of QUERIES) {
    const resp = await vk('newsfeed.search', {
      q,
      count: '200',
      extended: '1',
      start_time: String(SINCE),
    })
    const items: any[] = resp?.items || []
    const profiles: any[] = resp?.profiles || []
    const groups: any[] = resp?.groups || []
    let photos = 0
    for (const post of items) {
      const atts: any[] = post.attachments || []
      const author = resolveAuthor(post.owner_id, profiles, groups)
      let idx = 0
      for (const att of atts) {
        if (att.type !== 'photo') continue
        const url = maxPhotoUrl(att.photo)
        idx += 1
        if (!url) continue
        const key = `${post.owner_id}_${post.id}_${idx}`
        if (found.has(key)) continue
        found.set(key, {
          vkKey: key,
          photoUrl: url,
          postUrl: `https://vk.com/wall${post.owner_id}_${post.id}`,
          authorName: author.name,
          authorUrl: author.url,
          text: (post.text || '').slice(0, 1000),
          foundQuery: q,
          vkPublishedAt: new Date(post.date * 1000).toISOString(),
        })
        photos += 1
      }
    }
    log(`«${q}»: постов ${items.length}, фото-кандидатов ${photos}`)
    // Пауза между запросами — не упереться в rate-limit VK (3 rps).
    await new Promise((r) => setTimeout(r, 500))
  }
  log(`Всего уникальных кандидатов из VK: ${found.size}`)

  const payload = await getPayload({ config })
  let created = 0
  let refreshed = 0
  let skipped = 0
  for (const c of found.values()) {
    const existing = await payload.find({
      collection: 'vk-candidates',
      where: { vkKey: { equals: c.vkKey } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) {
      const doc: any = existing.docs[0]
      // Кадр ещё не скачан → освежаем протухающий photoUrl; решение модератора
      // (status) не трогаем.
      if (!doc.media && doc.photoUrl !== c.photoUrl) {
        await payload.update({
          collection: 'vk-candidates',
          id: doc.id,
          data: { photoUrl: c.photoUrl },
          overrideAccess: true,
          context: { disableRevalidate: true },
        })
        refreshed += 1
      } else {
        skipped += 1
      }
      continue
    }
    await payload.create({
      collection: 'vk-candidates',
      data: c as any,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    created += 1
  }
  log(`Готово: новых ${created}, освежено URL ${refreshed}, без изменений ${skipped}.`)
  log('Модерация: /admin → «Фотостена — кандидаты из VK» → статус «Одобрено».')
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
