import { NextResponse } from 'next/server'

import { isVkConfigured } from '../../../../../lib/vk'
import { visitorFromHeaders } from '../../../../../lib/visitorSession'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Статус входа через VK для клиента (компонент VisitorAuth в шапке):
//   configured — заданы ли креды VK (иначе кнопку не показываем);
//   visitor    — текущий вошедший посетитель (имя+аватар) либо null.
export async function GET(req: Request) {
  const v = visitorFromHeaders(req.headers)
  return NextResponse.json({
    configured: isVkConfigured(),
    visitor: v ? { name: v.name, avatarUrl: v.avatarUrl } : null,
  })
}
