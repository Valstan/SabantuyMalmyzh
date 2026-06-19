import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

import { t, type Locale } from '../../../lib/i18n'
import { MAP_TYPE_ORDER, mapTypeMeta } from '../../../lib/mapTypes'
import { withRetry } from '../../../lib/withRetry'
import { SectionHeading } from '../components/SectionHeading'

// Общее тело карты фестиваля (ru: /map, tt: /tt/map). intro/points — с locale.
type Point = { label?: string | null; type?: string | null; note?: string | null }

async function getMap(locale: Locale) {
  try {
    return await withRetry(async () => {
      const payload = await getPayload({ config })
      return await payload.findGlobal({ slug: 'festival-map', depth: 1, locale })
    })
  } catch {
    return null
  }
}

export async function MapView({ locale }: { locale: Locale }) {
  const map = await getMap(locale)
  const plan =
    map?.planImage && typeof map.planImage === 'object'
      ? (map.planImage as { url?: string | null; alt?: string | null })
      : null
  const points: Point[] = Array.isArray(map?.points) ? (map!.points as Point[]) : []

  const grouped = MAP_TYPE_ORDER.map((type) => ({
    type,
    meta: mapTypeMeta(type, locale),
    items: points.filter((p) => (p.type ?? 'other') === type && p.label),
  })).filter((g) => g.items.length > 0)

  return (
    <main>
      <section className="section">
        <div className="section-inner">
          <SectionHeading eyebrow={t(locale, 'home.map.eyebrow')} title={t(locale, 'home.map.title')} />
          {map?.intro && <p className="section-lead">{map.intro}</p>}

          {plan?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="map-plan" src={plan.url} alt={plan.alt || t(locale, 'home.map.title')} />
          ) : (
            <div className="placeholder">{t(locale, 'map.empty')}</div>
          )}

          {grouped.length > 0 && (
            <section className="map-legend" aria-label={t(locale, 'map.objects')}>
              {grouped.map((g) => (
                <div className="map-legend-group" key={g.type}>
                  <h2>
                    <span aria-hidden="true">{g.meta.icon}</span> {g.meta.label}
                  </h2>
                  <ul>
                    {g.items.map((p, i) => (
                      <li key={i}>
                        <span className="map-point-label">{p.label}</span>
                        {p.note && <span className="map-point-note"> — {p.note}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </div>
      </section>
    </main>
  )
}

export const mapMeta = (locale: Locale): Metadata => ({ title: `${t(locale, 'home.map.title')} — Сабантуй Малмыж` })
