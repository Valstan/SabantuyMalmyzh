/**
 * Восстановление рантайм-секретов из общего хранилища КАРМАНа (vault).
 * Сценарий A спеки `brain_matrica/docs/specs/vault-client.md` (ADR-0012, волна 1).
 *
 * Роли (иначе два места превращаются в два мнения):
 *   /etc/sabantuy/sabantuy.env — ИСТОЧНИК ИСТИНЫ рантайма (systemd EnvironmentFile, #008)
 *   комната vault             — копия-для-восстановления + точка доставки при ротации
 *
 * В норме этот модуль НИЧЕГО не делает: обязательные ключи на месте → ноль сетевых
 * вызовов и мгновенный выход. Работа начинается только когда локальная копия env
 * потеряна (переставили бокс, снесли файл) — тогда приложение поднимается из vault.
 */

// Хранилище КАРМАНа. Переопределяется SECRETS_VAULT_URL — но ТОЛЬКО из локального
// окружения, никогда из ответа самого хранилища (свойство 6 спеки).
const VAULT_URL = 'https://831d0ce99bdf.vps.myjino.ru/api/secrets'

// Ключи, без которых сервер не стартует. Их отсутствие = «локальная копия потеряна».
const REQUIRED = ['DATABASE_URL', 'PAYLOAD_SECRET'] as const

/**
 * ⚠️ Allowlist: принимаем ТОЛЬКО эти имена. Всё остальное из ответа игнорируется,
 * даже если пришло, — «любой пришедший ключ» это примитив инъекции, как только
 * выдача становится машинной (`NODE_OPTIONS`, `LD_PRELOAD` проходят валидацию
 * имени env-переменной и приезжают в процесс). Свойство 2 спеки.
 *
 * 🔗 ЯКОРЬ: новый рантайм-секрет в `web/.env.example` → добавить и сюда.
 *    Пара `.env.example` ↔ allowlist меняется ВМЕСТЕ, иначе восстановление молча
 *    перестаёт покрывать новый секрет.
 *
 * 🚫 НИКОГДА не включать сюда `SECRETS_TOKEN` и `SECRETS_VAULT_URL` (свойство 6):
 *    комната не должна уметь перенаправить будущие обращения клиента на чужой URL.
 *
 * ℹ️ `NEXT_PUBLIC_*` сюда не входят принципиально: они бейкаются в бандл при сборке,
 *    рантайму их подсовывать бессмысленно (ротация = пересборка).
 */
const ACCEPTED: ReadonlySet<string> = new Set<string>([
  ...REQUIRED,
  // Почта (заявки, подписки)
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_ADDRESS',
  'SMTP_FROM_NAME',
  'ORGANIZER_EMAIL',
  // Object Storage (медиа «Народной ленты»)
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_PUBLIC_BASE_URL',
  // Вход посетителя через VK ID
  'VK_CLIENT_ID',
  'VK_CLIENT_SECRET',
  'VK_REDIRECT_URI',
  'VK_SCOPE',
  // Web-push
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  // Персистентный каталог медиа на боксе
  'MEDIA_DIR',
])

export type BootstrapReason = 'local-env-intact' | 'no-token' | 'recovered' | 'fetch-failed'

export type BootstrapResult = {
  recovered: number
  /** Имена ключей из ответа, отвергнутых allowlist'ом (для лога и приёмки). */
  ignored: string[]
  reason: BootstrapReason
}

export async function bootstrapSecretsFromVault(
  env: Record<string, string | undefined> = process.env,
  /** Инъекция для тестов; в рантайме — глобальный fetch. */
  fetchImpl: typeof fetch = fetch,
): Promise<BootstrapResult> {
  // Свойство 1: в норме — ноль сетевых вызовов.
  const missing = REQUIRED.filter((k) => !env[k])
  if (missing.length === 0) return { recovered: 0, ignored: [], reason: 'local-env-intact' }

  // Свойство 5: bootstrap-токен живёт ОТДЕЛЬНО от восстанавливаемого файла
  // (/etc/sabantuy/secrets-token.env, 600) — иначе теряется вместе с ним.
  const token = env.SECRETS_TOKEN
  if (!token) {
    console.warn(
      `[secrets] локальная копия потеряна (${missing.join(', ')}), SECRETS_TOKEN не задан — восстановление невозможно`,
    )
    return { recovered: 0, ignored: [], reason: 'no-token' }
  }

  try {
    const res = await fetchImpl(env.SECRETS_VAULT_URL ?? VAULT_URL, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000), // vault не должен вешать старт
    })
    if (!res.ok) throw new Error(`GET ${res.status}`)
    const body = (await res.json()) as { secrets?: Record<string, string> }

    let recovered = 0
    const ignored: string[] = []
    for (const [key, value] of Object.entries(body.secrets ?? {})) {
      if (!ACCEPTED.has(key)) {
        ignored.push(key) // ← ключевая строка: без неё allowlist декорация
        continue
      }
      if (env[key] !== undefined) continue // свойство 3: systemd сильнее
      env[key] = String(value)
      recovered++
    }

    // Свойство 7: имена, НЕ значения. Чужой ключ в комнате — сигнал инцидента, не шум.
    if (ignored.length) {
      console.warn(`[secrets] вне allowlist, проигнорированы: ${ignored.join(', ')}`)
    }
    console.warn(`[secrets] восстановлено из vault: ${recovered}`)
    return { recovered, ignored, reason: 'recovered' }
  } catch (e) {
    // Свойство 4: best-effort. Не валим старт — приложение упадёт дальше по своей
    // настоящей причине, а не по причине «не смог сходить в vault».
    console.error(`[secrets] восстановление не удалось: ${(e as Error).message}`)
    return { recovered: 0, ignored: [], reason: 'fetch-failed' }
  }
}
