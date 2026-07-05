import type { CollectionAfterChangeHook } from 'payload'

// Одобрение кандидата фотостены (I8): status → approved и кадр ещё не скачан →
// качаем photoUrl (VK CDN) и кладём в Media (file-буфером, без temp-файлов),
// затем проставляем media у кандидата (context-флаг рвёт рекурсию afterChange).
//
// Ошибка скачивания НЕ роняет сохранение в /admin (ссылки VK CDN протухают):
// пишем downloadError, кандидат остаётся approved без media — страница его
// пропустит, повторный прогон коллектора освежит photoUrl.
export const approveVkCandidate: CollectionAfterChangeHook = async ({ doc, req }) => {
  const { payload, context } = req
  if (context.vkApproveInternal) return doc
  if (doc.status !== 'approved' || doc.media || !doc.photoUrl) return doc

  try {
    const res = await fetch(doc.photoUrl, { signal: AbortSignal.timeout(20_000) })
    if (!res.ok) throw new Error(`VK CDN ответил ${res.status}`)
    const mime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
    if (!mime.startsWith('image/')) throw new Error(`не картинка: ${mime}`)
    const data = Buffer.from(await res.arrayBuffer())
    if (data.length < 1024) throw new Error(`подозрительно маленький файл (${data.length} байт)`)

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
    const name = `fotostena-${String(doc.vkKey).replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`
    const alt = doc.authorName
      ? `Сабантуй в Малмыже. Фото: ${doc.authorName}, ВКонтакте`
      : 'Сабантуй в Малмыже. Фото из ВКонтакте'

    const media = await payload.create({
      collection: 'media',
      data: { alt },
      file: { data, mimetype: mime, name, size: data.length },
      overrideAccess: true,
      req,
    })
    // req обязателен: без него внутренний update идёт ОТДЕЛЬНОЙ транзакцией и
    // виснет на row-lock внешнего сохранения (дедлок, пойман на dev).
    await payload.update({
      collection: 'vk-candidates',
      id: doc.id,
      data: { media: media.id, downloadError: null },
      overrideAccess: true,
      req,
      context: { vkApproveInternal: true },
    })
    payload.logger.info(`[fotostena] кандидат ${doc.vkKey} одобрен → media id=${media.id}`)
    return { ...doc, media: media.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    payload.logger.error(`[fotostena] скачивание ${doc.vkKey} не удалось: ${msg}`)
    await payload
      .update({
        collection: 'vk-candidates',
        id: doc.id,
        data: { downloadError: msg.slice(0, 300) },
        overrideAccess: true,
        req,
        context: { vkApproveInternal: true },
      })
      .catch(() => {})
    return doc
  }
}
