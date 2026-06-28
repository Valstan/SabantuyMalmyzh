// Статистика игры «Фотобитва» (отдельная страница). Рейтинг — per-ФОТО (пост+индекс
// кадра): мульти-файловые посты соревнуются каждым кадром. Считается на лету из раундов
// (коллекция photo-battles) с фильтром по календарному месяцу (МСК) — это и есть
// «месячный рейтинг со сбросом 1-го числа»; история — те же раунды по прошлым месяцам.

// Одно фото в рейтинге: победы/показы за месяц + где взять кадр (URL уже на Object Storage).
export type BattlePhotoStat = {
  subId: number
  idx: number
  mediaUrl: string
  authorName: string | null
  wins: number
  shows: number
}

// Топ за один месяц.
export type MonthTop = {
  month: string // 'YYYY-MM'
  top: BattlePhotoStat[]
}

export type FotobitvaStatsData = {
  currentMonth: string // 'YYYY-MM' (МСК)
  current: BattlePhotoStat[] // топ текущего месяца
  history: MonthTop[] // прошлые месяцы, новые сверху
  totalRounds: number // всего сыграно раундов (для лида/пустого состояния)
}
