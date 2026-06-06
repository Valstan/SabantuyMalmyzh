import type { CollectionAfterChangeHook } from 'payload'

// Письмо-подтверждение подписчику (идея I6). Тот же паттерн, что notifyOrganizer:
// пока SMTP-адаптер не сконфигурирован — Payload пишет письмо в консоль; на проде с
// SMTP_* в env тот же код шлёт реальное письмо, без изменений здесь.
//
// Отказоустойчиво: ошибка отправки логируется, но НЕ роняет подписку (посетитель не
// должен получить 500 из-за проблем с почтой). Само напоминание о дате орги шлют позже.
export const confirmSubscription: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc
  if (!doc.email) return doc

  try {
    await req.payload.sendEmail({
      to: doc.email,
      subject: 'Вы подписались на анонс Сабантуя в Малмыже',
      text: [
        doc.name ? `Здравствуйте, ${doc.name}!` : 'Здравствуйте!',
        '',
        'Вы подписались на анонс праздника «Сабантуй Малмыж».',
        'Мы напомним вам о дате и программе ближе к мероприятию.',
        '',
        'Если это были не вы — просто проигнорируйте это письмо.',
        '',
        'До встречи на майдане!',
      ].join('\n'),
    })
  } catch (err) {
    req.payload.logger.error({ err }, '[subscribers] не удалось отправить письмо-подтверждение')
  }

  return doc
}
