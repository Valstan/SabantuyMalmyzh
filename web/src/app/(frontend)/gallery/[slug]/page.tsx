import type { Metadata } from 'next'

import config from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { SectionHeading } from '../../components/SectionHeading'

// Альбом галереи: фото-сетка + встроенные видео (Rutube/VK), если есть.
export const revalidate = 60

type Args = { params: Promise<{ slug: string }> }

type MediaLike = { url?: string | null; alt?: string | null; sizes?: Record<string, { url?: string | null }> }

async function queryAlbum(slug: string) {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'gallery',
      where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
      limit: 1,
      pagination: false,
      depth: 1,
    })
    return res.docs[0] ?? null
  } catch {
    return null
  }
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }) : null

export default async function AlbumPage({ params }: Args) {
  const { slug } = await params
  const album = await queryAlbum(decodeURIComponent(slug))
  if (!album) notFound()

  const photos = Array.isArray(album.photos) ? album.photos : []

  return (
    <main>
      <section className="section">
        <div className="section-inner">
          <p style={{ marginBottom: '1rem' }}>
            <Link className="breadcrumb" href="/gallery">
              ← Галерея
            </Link>
          </p>
          <SectionHeading eyebrow="Альбом" title={album.title} />
          {album.description && <p className="section-lead">{album.description}</p>}
          {fmtDate(album.date) && <p className="meta">{fmtDate(album.date)}</p>}

          {photos.length > 0 ? (
            <div className="photo-grid">
          {photos.map((p, i) => {
            const img = p.image && typeof p.image === 'object' ? (p.image as MediaLike) : null
            const src = img?.sizes?.card?.url || img?.url || null
            const full = img?.url || src
            if (!src) return null
            return (
              <figure className="photo-grid-item" key={i}>
                <a href={full || src} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={p.caption || img?.alt || album.title} loading="lazy" />
                </a>
                {p.caption && <figcaption>{p.caption}</figcaption>}
              </figure>
            )
          })}
            </div>
          ) : (
            <div className="placeholder">В этом альбоме пока нет фотографий.</div>
          )}
        </div>
      </section>
    </main>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const album = await queryAlbum(decodeURIComponent(slug))
  return { title: album ? `${album.title} — Галерея` : 'Альбом не найден' }
}
