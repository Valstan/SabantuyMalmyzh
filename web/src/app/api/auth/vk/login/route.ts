import { NextResponse } from 'next/server'

import { buildAuthorizeUrl, codeChallengeOf, isVkConfigured, makeCodeVerifier, makeState } from '../../../../../lib/vk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Старт входа через VK ID: генерим state (анти-CSRF) + PKCE-верификатор, кладём их в
// короткоживущие httpOnly-cookie (переживают редирект на VK при SameSite=Lax), затем
// 302 на authorize-страницу VK. Куда вернуть после входа — берём из ?next (только
// локальный путь, анти-open-redirect), по умолчанию /lenta.
const OAUTH_MAXAGE = 600 // 10 мин на завершение входа

function safeNext(raw: string | null): string {
  if (!raw) return '/lenta'
  // только относительный путь, без protocol-relative '//host'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/lenta'
  return raw
}

export async function GET(req: Request) {
  if (!isVkConfigured()) {
    return NextResponse.json({ error: 'Вход через VK пока не настроен.' }, { status: 503 })
  }

  const url = new URL(req.url)
  const next = safeNext(url.searchParams.get('next'))

  const state = makeState()
  const verifier = makeCodeVerifier()
  const challenge = codeChallengeOf(verifier)

  const res = NextResponse.redirect(buildAuthorizeUrl(state, challenge))
  const secure = (process.env.NEXT_PUBLIC_SERVER_URL || '').startsWith('https')
  const opts = { httpOnly: true, sameSite: 'lax' as const, secure, path: '/', maxAge: OAUTH_MAXAGE }
  res.cookies.set('vk_oauth_state', state, opts)
  res.cookies.set('vk_oauth_verifier', verifier, opts)
  res.cookies.set('vk_oauth_next', next, opts)
  return res
}
