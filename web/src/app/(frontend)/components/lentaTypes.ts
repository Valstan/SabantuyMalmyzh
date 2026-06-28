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
