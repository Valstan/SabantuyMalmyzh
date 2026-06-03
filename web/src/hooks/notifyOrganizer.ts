import type { CollectionAfterChangeHook } from 'payload'

// Уведомление организатору о новой заявке.
//
// Каркас готов к проду: адрес берём из ORGANIZER_EMAIL, отправку делаем через
// payload.sendEmail. Сейчас email-адаптер не сконфигурирован → Payload пишет письмо
// в консоль (тот самый WARN «No email adapter»). На проде добавляется SMTP-адаптер в
// payload.config — и тот же код начинает слать реальные письма, без изменений здесь.
//
// Отказоустойчиво: любая ошибка отправки логируется, но НЕ роняет создание заявки
// (посетитель не должен получить 500 из-за проблем с почтой).
export const notifyOrganizer: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc

  const to = process.env.ORGANIZER_EMAIL
  if (!to) {
    req.payload.logger.info('[registrations] ORGANIZER_EMAIL не задан — уведомление пропущено')
    return doc
  }

  const eventId = typeof doc.event === 'object' && doc.event !== null ? doc.event.id : doc.event

  try {
    await req.payload.sendEmail({
      to,
      subject: `Новая заявка на участие: ${doc.fullName}`,
      text: [
        'Поступила новая заявка на участие в мероприятии.',
        '',
        `ФИО:          ${doc.fullName}`,
        `Телефон:      ${doc.phone}`,
        `Email:        ${doc.email || '—'}`,
        `Участников:   ${doc.participants}`,
        `Событие (id): ${eventId}`,
        `Комментарий:  ${doc.comment || '—'}`,
        '',
        `Открыть в админке: /admin/collections/registrations/${doc.id}`,
      ].join('\n'),
    })
  } catch (err) {
    req.payload.logger.error({ err }, '[registrations] не удалось отправить уведомление организатору')
  }

  return doc
}
