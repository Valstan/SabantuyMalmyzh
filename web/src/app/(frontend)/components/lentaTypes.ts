// Карточка «Народной ленты» — данные, подготовленные сервером (LentaView), либо
// собранные на клиенте после загрузки (LentaUpload) для оптимистичного показа.
// Медиа-URL уже указывает на Object Storage (publicUrl) — браузер грузит напрямую.
export type LentaItem = {
  id: number
  kind: 'photo' | 'video'
  mediaUrl: string
  posterUrl: string | null
  authorName: string | null
  caption: string | null
  phase: 'preparation' | 'festival'
  likeCount: number
  commentCount: number
  viewCount: number
  width: number | null
  height: number | null
}

// --- Рейтинги (вкладка «Рейтинг», PR2) — считаются сервером по всем видимым
// публикациям, передаются клиенту вместе с лентой (роут остаётся ISR force-static). ---

// Автор в ТОП-рейтинге. Только вошедшие через VK (ownerVisitor) — у них надёжная
// личность (имя+аватар из visitors), анти-подмена. Аноним/по-имени не ранжируются.
export type LentaAuthorStat = {
  visitorId: number
  name: string | null
  avatarUrl: string | null
  postCount: number
  totalLikes: number
  totalViews: number
}

// Ролик в ТОП-рейтинге (по лайкам/просмотрам в системе).
export type LentaTopItem = {
  id: number
  kind: 'photo' | 'video'
  mediaUrl: string
  posterUrl: string | null
  authorName: string | null
  likeCount: number
  viewCount: number
}

export type LentaRatings = {
  authors: LentaAuthorStat[]
  topByLikes: LentaTopItem[]
  topByViews: LentaTopItem[]
}
