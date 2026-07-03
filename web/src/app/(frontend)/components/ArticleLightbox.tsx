'use client'

import { useEffect, useRef, useState } from 'react'

import type { Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import { LentaLightbox } from './LentaLightbox'
import type { LentaMedia } from './lentaTypes'

// Единый просмотр фото на сайте (заявка владельца): любые картинки внутри
// обёрнутого контента (richText-тело новости/страницы) открываются тем же
// лайтбоксом, что и «Народная лента» — пролистывание ‹/›, свайп, на весь экран,
// поделиться; плюс переход в общую медиатеку сайта. Работает поверх ЛЮБОЙ
// разметки: после монтирования собирает <img> из контейнера и вешает клики —
// серверный рендер (ISR) не меняется.
export function ArticleLightbox({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [media, setMedia] = useState<LentaMedia[]>([])
  const [index, setIndex] = useState<number | null>(null)
  const [alts, setAlts] = useState<string[]>([])

  useEffect(() => {
    const root = boxRef.current
    if (!root) return
    const imgs = [...root.querySelectorAll<HTMLImageElement>('img')].filter(
      (img) => !img.closest('a'), // картинки-ссылки ведут куда ведут — не перехватываем
    )
    if (imgs.length === 0) return
    const list: LentaMedia[] = imgs.map((img) => ({
      kind: 'photo',
      mediaUrl: img.currentSrc || img.src,
      posterUrl: null,
      width: img.naturalWidth || null,
      height: img.naturalHeight || null,
    }))
    setMedia(list)
    setAlts(imgs.map((img) => img.alt || ''))
    const handlers = imgs.map((img, i) => {
      const onClick = (e: MouseEvent) => {
        e.preventDefault()
        setIndex(i)
      }
      img.style.cursor = 'zoom-in'
      img.addEventListener('click', onClick)
      return () => img.removeEventListener('click', onClick)
    })
    return () => handlers.forEach((off) => off())
  }, [children])

  return (
    <div ref={boxRef}>
      {children}
      {index !== null && media[index] && (
        <LentaLightbox
          media={media}
          index={index}
          caption={alts[index] || null}
          authorName={null}
          locale={locale}
          onClose={() => setIndex(null)}
          onNavigate={setIndex}
          libraryHref={localeHref(locale, '/mediateka')}
        />
      )}
    </div>
  )
}
