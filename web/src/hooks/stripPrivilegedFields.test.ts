import { describe, expect, it } from 'vitest'

import { stripPrivilegedFields } from './stripPrivilegedFields'

// G194: защитный слой стрижёт служебные поля только у ВНЕШНИХ запросов и только
// у не-персонала. Тест закрепляет обе половины условия, потому что ошибка в любой
// из них молчаливая:
//  - слишком широко — перестают обновляться счётчики (запись проходит, число нет);
//  - слишком узко — клиент подменяет статус публикации.

const call = (data: Record<string, unknown>, req: Record<string, unknown>) =>
  stripPrivilegedFields({ data, req } as unknown as Parameters<typeof stripPrivilegedFields>[0]) as Record<
    string,
    unknown
  >

const hostile = {
  caption: 'подпись',
  status: 'visible',
  hiddenReason: 'x',
  likeCount: 999,
  commentCount: 999,
  viewCount: 999,
  reportCount: 0,
  ownerHash: 'чужой',
}

describe('stripPrivilegedFields', () => {
  it('внешний запрос без юзера (REST, аноним): служебные поля стёрты', () => {
    const out = call({ ...hostile }, { payloadAPI: 'REST' })

    expect(out.caption).toBe('подпись')
    for (const field of Object.keys(hostile)) {
      if (field === 'caption') continue
      expect(out[field], `поле ${field} должно быть стёрто`).toBeUndefined()
    }
  })

  it('внешний запрос GraphQL — та же участь', () => {
    const out = call({ status: 'visible', viewCount: 5 }, { payloadAPI: 'GraphQL' })
    expect(out.status).toBeUndefined()
    expect(out.viewCount).toBeUndefined()
  })

  it('внешний запрос от посетителя (role: visitor): тоже стёрты', () => {
    const out = call({ status: 'visible' }, { payloadAPI: 'REST', user: { role: 'visitor' } })
    expect(out.status).toBeUndefined()
  })

  it('персонал через REST: поля остаются, редактор в админке должен их менять', () => {
    const out = call({ status: 'hidden', hiddenReason: 'спам' }, { payloadAPI: 'REST', user: { role: 'editor' } })
    expect(out.status).toBe('hidden')
    expect(out.hiddenReason).toBe('спам')
  })

  it('локальный API (наш код без юзера): НЕ трогаем — иначе счётчики замолчат', () => {
    const out = call({ viewCount: 42, likeCount: 7, commentCount: 3 }, { payloadAPI: 'local' })
    expect(out.viewCount).toBe(42)
    expect(out.likeCount).toBe(7)
    expect(out.commentCount).toBe(3)
  })

  it('локальный API от серверного роута (удаление автором): status остаётся', () => {
    const out = call({ status: 'removed', hiddenReason: 'удалено автором' }, { payloadAPI: 'local' })
    expect(out.status).toBe('removed')
    expect(out.hiddenReason).toBe('удалено автором')
  })

  it('пустые данные и не-объект не ломают хук', () => {
    expect(call({}, { payloadAPI: 'REST' })).toEqual({})
    const passthrough = stripPrivilegedFields({ data: undefined, req: { payloadAPI: 'REST' } } as never)
    expect(passthrough).toBeUndefined()
  })
})
