/**
 * Next.js instrumentation — выполняется ОДИН РАЗ при старте сервера, до обработки
 * первого запроса (Next дожидается `register()`). Единственная точка, где можно
 * дописать `process.env` раньше, чем модули приложения его прочитают.
 *
 * Здесь — восстановление рантайм-секретов из vault КАРМАНа (сценарий A, ADR-0012).
 * В норме это ноль сетевых вызовов и мгновенный выход: ключи на месте.
 */
export async function register() {
  // Edge-рантайм не имеет ни доступа к /etc, ни смысла восстанавливать env.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { bootstrapSecretsFromVault } = await import('./lib/secretsBootstrap')
  // Best-effort по спеке: любая проблема хранилища не должна валить старт.
  await bootstrapSecretsFromVault().catch(() => undefined)
}
