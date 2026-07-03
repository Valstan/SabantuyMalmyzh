import { NextResponse } from 'next/server'

import { getPayloadClient } from '../../../../lib/ugcOwner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Удалить push-подписку по endpoint (браузер знает свой endpoint → фактическое
// владение; чужой endpoint не угадать). Идемпотентно: нет записи → тоже ok.
export async function POST(req: Request) {
  let endpoint: unknown
  try {
    endpoint = ((await req.json()) as { endpoint?: unknown }).endpoint
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }
  if (typeof endpoint !== 'string' || !endpoint || endpoint.length > 1024) {
    return NextResponse.json({ error: 'bad_endpoint' }, { status: 400 })
  }
  const payload = await getPayloadClient()
  await payload.delete({
    collection: 'push-subscriptions',
    where: { endpoint: { equals: endpoint } },
    overrideAccess: true,
  })
  return NextResponse.json({ ok: true })
}
