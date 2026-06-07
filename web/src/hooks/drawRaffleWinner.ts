import type { CollectionBeforeChangeHook } from 'payload'

// Розыгрыш победителя (идея I4). Орг ставит галку drawNow в админке и сохраняет —
// хук выбирает случайную заявку, фиксирует winner+drawnAt, закрывает приём и
// сбрасывает drawNow (галка-триггер, не состояние). Случайность на сервере.
//
// Идемпотентно по смыслу: если победитель уже есть — повторно не разыгрываем
// (drawNow всё равно сбрасываем). На create розыгрыш не проводим (заявок ещё нет).
export const drawRaffleWinner: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data.drawNow) return data
  data.drawNow = false // триггер-галка: всегда снимаем

  const existingWinner = data.winner ?? originalDoc?.winner
  if (existingWinner) return data // уже разыгран — не перевыбираем

  const raffleId = originalDoc?.id
  if (!raffleId) return data // на create заявок ещё нет

  const entries = await req.payload.find({
    collection: 'raffle-entries',
    where: { raffle: { equals: raffleId } },
    depth: 0,
    limit: 1000,
    pagination: false,
  })

  if (entries.docs.length === 0) {
    req.payload.logger.info('[raffle] нет заявок — розыгрыш не проведён')
    return data
  }

  const pick = entries.docs[Math.floor(Math.random() * entries.docs.length)]!
  data.winner = pick.id
  data.drawnAt = new Date().toISOString()
  data.isOpen = false
  req.payload.logger.info(`[raffle] победитель выбран: entry#${pick.id} из ${entries.docs.length} заявок`)

  return data
}
