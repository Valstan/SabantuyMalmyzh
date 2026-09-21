import { describe, expect, it } from 'vitest'

import {
  buildBody,
  buildPostData,
  findExistingPost,
  isPublished,
  normalizeRubric,
  normalizeVideos,
  secretMatches,
  type ExistingPost,
  type PostFinder,
} from './ingest'

// Тесты по следам двух багов вМалмыже (03.08), проехавших через зелёные lint и
// typecheck: публикация через `draft:false` и publish у любого держателя ключа.
// Первый vitest в проекте — условие из PENDING «следующий кусок серверной логики
// с ветвлением по правам → vitest, а не разовый скрипт» наступило здесь.

const base = {
  title: 'Заголовок',
  text: 'Первый абзац.\nВторой абзац.\nТретий абзац.',
  vkPostId: '-1_2',
  sourceUrl: 'https://vk.com/wall-1_2',
  videos: [],
  mediaIds: [],
}

describe('публикация: _status, а не только draft', () => {
  it('publish=true проставляет _status: published', () => {
    expect(buildPostData({ ...base, publish: true })._status).toBe('published')
  })
  it('publish=false не проставляет _status — остаётся черновик', () => {
    expect(buildPostData({ ...base, publish: false })).not.toHaveProperty('_status')
  })
})

describe('право публиковать отделено от права присылать', () => {
  it('пустой или чужой секрет не даёт права', () => {
    expect(secretMatches('', 'настоящий')).toBe(false)
    expect(secretMatches('подделка', 'настоящий')).toBe(false)
  })
  it('ненастроенный секрет на сервере не пускает никого', () => {
    expect(secretMatches('что угодно', undefined)).toBe(false)
    expect(secretMatches('', undefined)).toBe(false)
  })
  it('верный секрет даёт право', () => {
    expect(secretMatches('настоящий', 'настоящий')).toBe(true)
  })
})

describe('даты: публикуем датой оригинала', () => {
  const date = '2026-07-31T09:20:00.000Z'
  it('без publishedAt подставляется дата новости, а не «сейчас»', () => {
    expect(buildPostData({ ...base, publish: true, date }).publishedAt).toBe(date)
  })
})

describe('рубрика: одна, чужая — warning', () => {
  it('news принимается, prep — warning и пусто', () => {
    const w: string[] = []
    expect(normalizeRubric('news', w)).toBe('news')
    expect(normalizeRubric('prep', w)).toBeUndefined()
    expect(w).toEqual(['unknown rubric: prep'])
  })
})

describe('форма документа news', () => {
  it('анонс — первый абзац, источник — в группе source, видео — в массиве videos', () => {
    const data = buildPostData({ ...base, publish: false, videos: [{ url: 'https://vk.com/video-1_2' }] })
    expect(data.excerpt).toBe('Первый абзац.')
    expect(data.source).toEqual({ vkPostId: '-1_2', sourceUrl: 'https://vk.com/wall-1_2' })
    expect(data.videos).toEqual([{ url: 'https://vk.com/video-1_2', title: undefined }])
  })
  it('первое медиа — обложка, остальные встраиваются между абзацами узлами upload', () => {
    const body = buildBody(base.text, [10, 11, 12])
    const types = body.root.children.map((n) => n.type)
    expect(types.filter((t) => t === 'upload')).toHaveLength(2)
    expect(types[0]).toBe('paragraph')
    const uploads = body.root.children.filter((n) => n.type === 'upload') as unknown as {
      value: number
      relationTo: string
    }[]
    expect(uploads.map((u) => u.value)).toEqual([11, 12])
    expect(uploads[0].relationTo).toBe('media')
  })
  it('пост из одних фото без текста: картинки всё равно в теле', () => {
    const body = buildBody('', [10, 11])
    expect(body.root.children.map((n) => n.type)).toEqual(['upload'])
  })
  it('без текста и без второго медиа body не строится', () => {
    expect(buildPostData({ ...base, text: '', publish: false, mediaIds: [10] }).body).toBeUndefined()
  })
})

describe('видео', () => {
  it('строки и объекты нормализуются, мусор — warning', () => {
    const w: string[] = []
    expect(normalizeVideos(['https://vk.com/video1', { url: 'https://rutube.ru/x', title: 'Т' }, 'ftp://x'], w)).toEqual([
      { url: 'https://vk.com/video1', title: undefined },
      { url: 'https://rutube.ru/x', title: 'Т' },
    ])
    expect(w).toEqual(['video 2: invalid url'])
  })
})

describe('идемпотентность', () => {
  const finder = (docs: ExistingPost[]): PostFinder => ({
    find: async ({ collection, where }) => {
      expect(collection).toBe('news')
      expect(where).toEqual({ 'source.vkPostId': { equals: '-1_2' } })
      return { docs }
    },
  })
  it('ищет по source.vkPostId в коллекции news', async () => {
    expect(await findExistingPost(finder([{ id: 7, _status: 'draft' }]), '-1_2')).toEqual({ id: 7, _status: 'draft' })
    expect(await findExistingPost(finder([]), '-1_2')).toBeUndefined()
  })
  it('опубликованное не трогаем, черновик — трогаем', () => {
    expect(isPublished({ id: 1, _status: 'published' })).toBe(true)
    expect(isPublished({ id: 1, _status: 'draft' })).toBe(false)
    expect(isPublished({ id: 1 })).toBe(false)
  })
})
