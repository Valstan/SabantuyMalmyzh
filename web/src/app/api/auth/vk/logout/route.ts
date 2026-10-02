import { NextResponse } from 'next/server'

import { LEGACY_VISITOR_COOKIE, VISITOR_COOKIE } from '../../../../../lib/visitorSession'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Выход посетителя: гасим сессию-cookie. Стафф-вход (payload-token) не трогаем.
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(VISITOR_COOKIE, '', { path: '/', maxAge: 0, secure: true, httpOnly: true, sameSite: 'lax' })
  res.cookies.set(LEGACY_VISITOR_COOKIE, '', { path: '/', maxAge: 0, secure: true, httpOnly: true, sameSite: 'lax' })
  return res
}
