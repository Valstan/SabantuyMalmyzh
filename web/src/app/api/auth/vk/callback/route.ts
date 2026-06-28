import { NextResponse } from 'next/server'

import { getPayloadClient } from '../../../../../lib/ugcOwner'
import { exchangeToken, fetchUserInfo, isVkConfigured } from '../../../../../lib/vk'
import { VISITOR_COOKIE, signVisitorSession } from '../../../../../lib/visitorSession'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Возврат от VK ID: сверяем state с cookie (анти-CSRF), меняем code на токен (PKCE,
// device_id из query), тянем профиль, upsert'им посетителя (visitors), ставим
// подписанную сессию-cookie и редиректим назад (vk_oauth_next). Любая ошибка — мягкий
// редирект на /lenta?vklogin=error (вход опционален, прод не ломаем).

function absUrl(path: string, reqUrl: string): string {
  let base = (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/+$/, '')
  if (!base) base = new URL(reqUrl).origin
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function safeNext(raw: string | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/lenta'
  return raw
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const cookieNext = req.headers.get('cookie')?.match(/(?:^|;\s*)vk_oauth_next=([^;]+)/)?.[1]
  const next = safeNext(cookieNext ? decodeURIComponent(cookieNext) : undefined)
  const fail = () => {
    const res = NextResponse.redirect(absUrl(`${next}${next.includes('?') ? '&' : '?'}vklogin=error`, req.url))
    clearOauthCookies(res)
    return res
  }

  if (!isVkConfigured()) return fail()

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const deviceId = url.searchParams.get('device_id') || ''
  const cookie = req.headers.get('cookie') || ''
  const stateCookie = cookie.match(/(?:^|;\s*)vk_oauth_state=([^;]+)/)?.[1]
  const verifier = cookie.match(/(?:^|;\s*)vk_oauth_verifier=([^;]+)/)?.[1]

  // анти-CSRF: state из query должен совпасть со state из cookie
  if (!code || !state || !stateCookie || !verifier || decodeURIComponent(stateCookie) !== state) {
    return fail()
  }

  try {
    const { accessToken, userId } = await exchangeToken({
      code,
      codeVerifier: decodeURIComponent(verifier),
      deviceId,
      state,
    })
    const profile = await fetchUserInfo(accessToken, userId)

    const payload = await getPayloadClient()
    const existing = await payload.find({
      collection: 'visitors',
      where: { vkId: { equals: profile.id } },
      limit: 1,
      overrideAccess: true,
    })
    const now = new Date().toISOString()
    let visitorId: number
    if (existing.docs[0]) {
      visitorId = existing.docs[0].id as number
      await payload.update({
        collection: 'visitors',
        id: visitorId,
        data: { name: profile.name, avatarUrl: profile.avatarUrl, lastLoginAt: now },
        overrideAccess: true,
      })
    } else {
      const created = await payload.create({
        collection: 'visitors',
        data: { vkId: profile.id, name: profile.name, avatarUrl: profile.avatarUrl, lastLoginAt: now },
        overrideAccess: true,
      })
      visitorId = created.id as number
    }

    const token = signVisitorSession({ visitorId, vkId: profile.id, name: profile.name, avatarUrl: profile.avatarUrl })
    const res = NextResponse.redirect(absUrl(next, req.url))
    const secure = (process.env.NEXT_PUBLIC_SERVER_URL || '').startsWith('https')
    res.cookies.set(VISITOR_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 90 * 24 * 60 * 60,
    })
    clearOauthCookies(res)
    return res
  } catch {
    return fail()
  }
}

function clearOauthCookies(res: NextResponse) {
  for (const name of ['vk_oauth_state', 'vk_oauth_verifier', 'vk_oauth_next']) {
    res.cookies.set(name, '', { path: '/', maxAge: 0 })
  }
}
