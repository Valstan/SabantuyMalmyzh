// Простой in-memory fixed-window rate-limiter.
//
// Достаточно для одно-инстансного VPS (наш случай): счётчики живут в памяти
// процесса Next/Payload. При горизонтальном масштабировании (несколько инстансов)
// понадобится общий стор (Redis) — на MVP не нужен.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
let lastSweep = 0

// Ленивая уборка протухших корзин, чтобы Map не рос безгранично по уникальным IP.
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key)
  }
}

export type RateLimitResult = { ok: boolean; retryAfterMs: number }

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const b = buckets.get(key)
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterMs: 0 }
  }

  if (b.count >= max) {
    return { ok: false, retryAfterMs: b.resetAt - now }
  }

  b.count += 1
  return { ok: true, retryAfterMs: 0 }
}
