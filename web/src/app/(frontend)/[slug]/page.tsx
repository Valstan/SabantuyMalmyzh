import type { Metadata } from 'next'

import config from '@payload-config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

// Статические страницы (политика обработки ПДн, о фестивале и т.п.) рендерим по slug.
// Сосуществует с /admin (Payload) и /events/[slug]: статические сегменты имеют приоритет
// над этим динамическим — проверено на референсе GONBA.
// ISR: статические страницы кэшируются + on-demand ревалидация (revalidatePageDoc).
export const revalidate = 60

type Args = { params: Promise<{ slug: string }> }

async function queryPageBySlug(slug: string) {
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: 'pages',
      where: {
        and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
      },
      limit: 1,
      pagination: false,
      depth: 1,
    })
    return res.docs[0] ?? null
  } catch {
    return null
  }
}

export default async function PageBySlug({ params }: Args) {
  const { slug } = await params
  const page = await queryPageBySlug(decodeURIComponent(slug))

  if (!page) notFound()

  return (
    <main className="container">
      <article className="page">
        <h1>{page.title}</h1>
        {page.content ? (
          <RichText data={page.content} />
        ) : (
          <p className="meta">Содержимое страницы пока не заполнено.</p>
        )}
      </article>
    </main>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const page = await queryPageBySlug(decodeURIComponent(slug))
  return { title: page?.title ?? 'Страница не найдена' }
}
