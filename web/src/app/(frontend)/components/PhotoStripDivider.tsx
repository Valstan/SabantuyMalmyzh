/**
 * V2 — фотолента-разделитель: тонкая полоса реальных кадров праздника между
 * секциями (вместо рисованного орнамента). Декоративная (aria-hidden). Нет
 * фото → ничего не рендерит (на главной — фолбэк на обычный фон секции).
 */
export function PhotoStripDivider({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null
  return (
    <div className="photo-strip-divider" aria-hidden="true">
      {photos.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt="" loading="lazy" />
      ))}
    </div>
  )
}
