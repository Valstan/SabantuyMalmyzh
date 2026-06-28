// Одно медиа поста (фото/видео). URL уже указывает на Object Storage — браузер грузит
// напрямую. Пост-в-стиле-ВК: одна подпись — несколько таких медиа (мозаика + галерея).
export type LentaMedia = {
  kind: 'photo' | 'video'
  mediaUrl: string
  posterUrl: string | null
  width: number | null
  height: number | null
}

// Карточка «Народной ленты» — данные, подготовленные сервером (LentaView), либо
// собранные на клиенте после загрузки (LentaUpload) для оптимистичного показа.
// `media` — все файлы поста (media[0] = обложка, ≤ UGC_MAX_FILES). Верхнеуровневые
// kind/mediaUrl/posterUrl/width/height дублируют обложку (media[0]) для удобства
// (Фотобитва, топы рейтинга) — карточка/лайтбокс итерируют `media`.
export type LentaItem = {
  id: number
  kind: 'photo' | 'video'
  mediaUrl: string
  posterUrl: string | null
  media: LentaMedia[]
  authorName: string | null
  caption: string | null
  phase: 'preparation' | 'festival'
  likeCount: number
  commentCount: number
  viewCount: number
  width: number | null
  height: number | null
}

// Одно фото-участник «Фотобитвы»: КАЖДЫЙ кадр КАЖДОГО поста (а не только обложка) —
// мульти-файловые посты дают в битву все свои фото. Идентичность фото = пост + индекс
// медиа в нём (для записи победы конкретного кадра и дедупа пар).
export type BattlePhoto = {
  subId: number
  idx: number
  mediaUrl: string
  authorName: string | null
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

// Ролик в ТОП-рейтинге (по лайкам/просмотрам/победам в Фотобитве в системе).
export type LentaTopItem = {
  id: number
  kind: 'photo' | 'video'
  mediaUrl: string
  posterUrl: string | null
  authorName: string | null
  likeCount: number
  viewCount: number
  battleWins: number
}

export type LentaRatings = {
  authors: LentaAuthorStat[]
  topByLikes: LentaTopItem[]
  topByViews: LentaTopItem[]
  topByBattle: LentaTopItem[]
}
