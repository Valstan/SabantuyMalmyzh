/**
 * Приёмка клиента vault (сценарий A) — мутационная, а не «шаг добавлен».
 * Спека: brain_matrica/docs/specs/vault-client.md, п. «Приёмка» + #114.
 *
 * Живой прогон против комнаты нам недоступен (SECRETS_TOKEN проекту не выдан),
 * поэтому проверяем клиента подставным ответом хранилища: это воспроизводимо,
 * гоняется в CI и ловит ровно те регрессы, ради которых написан allowlist.
 *
 * Запуск:  node web/scripts/verify-secrets-bootstrap.mjs
 */
// .ts импортируется напрямую: Node 22.6+ снимает типы сам (erasable syntax),
// отдельный раннер не нужен — скрипт запускается голым `node`.
const { bootstrapSecretsFromVault } = await import('../src/lib/secretsBootstrap.ts')

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ✅' : '  ❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}

const vaultReplying = (secrets) => {
  let calls = 0
  const impl = async () => {
    calls++
    return { ok: true, status: 200, json: async () => ({ secrets }) }
  }
  impl.calls = () => calls
  return impl
}

// ── 1. Норма: обязательные ключи на месте → ноль сетевых вызовов ──────────────
{
  const env = { DATABASE_URL: 'postgres://local', PAYLOAD_SECRET: 'local' }
  const fetchImpl = vaultReplying({ SMTP_PASS: 'from-vault' })
  const r = await bootstrapSecretsFromVault(env, fetchImpl)
  console.log('1. Локальная копия цела')
  check('ноль сетевых вызовов', fetchImpl.calls() === 0, `вызовов: ${fetchImpl.calls()}`)
  check('reason=local-env-intact', r.reason === 'local-env-intact', r.reason)
  check('окружение не тронуто', env.SMTP_PASS === undefined)
}

// ── 2. НЕГАТИВНЫЙ ПРОГОН: ключ вне allowlist не попадает в окружение ──────────
{
  const env = { SECRETS_TOKEN: 'test-token' } // DATABASE_URL/PAYLOAD_SECRET потеряны
  const r = await bootstrapSecretsFromVault(
    env,
    vaultReplying({
      DATABASE_URL: 'postgres://from-vault',
      NODE_OPTIONS: '--require /tmp/pwn.js', // ← RCE-примитив, ради которого allowlist
      LD_PRELOAD: '/tmp/pwn.so',
      PATH: '/tmp/evil',
      SMTP_PASS: 'from-vault',
    }),
  )
  console.log('2. Негативный прогон — чужие ключи в комнате')
  check('NODE_OPTIONS НЕ в окружении', env.NODE_OPTIONS === undefined, String(env.NODE_OPTIONS))
  check('LD_PRELOAD НЕ в окружении', env.LD_PRELOAD === undefined, String(env.LD_PRELOAD))
  check('PATH НЕ перезаписан', env.PATH === undefined, String(env.PATH))
  check(
    'все три посчитаны в ignored ПО ИМЕНАМ',
    ['NODE_OPTIONS', 'LD_PRELOAD', 'PATH'].every((k) => r.ignored.includes(k)),
    r.ignored.join(', '),
  )
  check('ключи из allowlist восстановлены', env.DATABASE_URL === 'postgres://from-vault' && env.SMTP_PASS === 'from-vault')
  check('recovered посчитан верно', r.recovered === 2, String(r.recovered))
}

// ── 3. Свойство 6: комната не может перенаправить клиента на чужой URL ────────
{
  const env = { SECRETS_TOKEN: 'test-token' }
  const r = await bootstrapSecretsFromVault(
    env,
    vaultReplying({
      DATABASE_URL: 'postgres://from-vault',
      PAYLOAD_SECRET: 'from-vault',
      SECRETS_VAULT_URL: 'https://attacker.example/api/secrets',
      SECRETS_TOKEN: 'attacker-token',
    }),
  )
  console.log('3. Bootstrap-конфиг клиента — вне allowlist (свойство 6)')
  check('SECRETS_VAULT_URL не принят', env.SECRETS_VAULT_URL === undefined, String(env.SECRETS_VAULT_URL))
  check('SECRETS_TOKEN не подменён', env.SECRETS_TOKEN === 'test-token', String(env.SECRETS_TOKEN))
  check('оба в ignored', r.ignored.includes('SECRETS_VAULT_URL') && r.ignored.includes('SECRETS_TOKEN'))
}

// ── 4. Свойство 3: значение systemd сильнее значения из комнаты ───────────────
{
  const env = { PAYLOAD_SECRET: 'from-systemd', SECRETS_TOKEN: 'test-token' } // нет DATABASE_URL
  await bootstrapSecretsFromVault(
    env,
    vaultReplying({ DATABASE_URL: 'postgres://from-vault', PAYLOAD_SECRET: 'from-vault' }),
  )
  console.log('4. systemd сильнее vault')
  check('локальное значение не перетёрто', env.PAYLOAD_SECRET === 'from-systemd', env.PAYLOAD_SECRET)
  check('отсутствующее — восстановлено', env.DATABASE_URL === 'postgres://from-vault')
}

// ── 5. Свойство 4: хранилище недоступно → предупреждение, не исключение ───────
{
  const env = { SECRETS_TOKEN: 'test-token' }
  const r = await bootstrapSecretsFromVault(env, async () => {
    throw new Error('ECONNREFUSED')
  })
  console.log('5. Хранилище недоступно')
  check('не бросает исключение, reason=fetch-failed', r.reason === 'fetch-failed', r.reason)
}

// ── 6. Свойство 5: нет токена → тихий выход без сетевых вызовов ───────────────
{
  const env = {}
  const fetchImpl = vaultReplying({ DATABASE_URL: 'x' })
  const r = await bootstrapSecretsFromVault(env, fetchImpl)
  console.log('6. SECRETS_TOKEN не задан')
  check('reason=no-token, сети не было', r.reason === 'no-token' && fetchImpl.calls() === 0)
}

console.log(failed === 0 ? '\n✅ Приёмка клиента vault пройдена' : `\n❌ Провалено проверок: ${failed}`)
process.exit(failed === 0 ? 0 : 1)
