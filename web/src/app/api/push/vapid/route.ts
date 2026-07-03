import { NextResponse } from 'next/server'

import { pushConfigured, vapidPublicKey } from '../../../../lib/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Публичный VAPID-ключ для pushManager.subscribe. Читается из РАНТАЙМ-env
// (не NEXT_PUBLIC_*): ключи заводит apply-push-secrets.yml без ребилда.
// Ключ публичный по протоколу — секрета тут нет. Без ключей → configured:false,
// клиент прячет кнопку подписки (degraded, как sign-upload без S3).
export async function GET() {
  if (!pushConfigured()) return NextResponse.json({ configured: false }, { status: 200 })
  return NextResponse.json({ configured: true, key: vapidPublicKey() })
}
