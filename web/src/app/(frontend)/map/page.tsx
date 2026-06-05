import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'

import { MAP_TYPE, MAP_TYPE_ORDER } from '../../../lib/mapTypes'
import { SectionHeading } from '../components/SectionHeading'

// ISR: карта меняется редко; on-demand ревалидация — revalidateFestivalMap.
// Без БД (сборка) findGlobal в try/catch → пустое состояние, build не падает.
export const revalidate = 60

export const metadata: Metadata = { title: 'Карта фестиваля — Сабантуй Малмыж' }

type Point = { label?: string | null; type?: string | null; note?: string | null }

async function getMap() {
  try {
    const payload = await getPayload({ config })
    return await payload.findGlobal({ slug: 'festival-map', depth: 1 })
  } catch {
    return null
  }
}

export default async function MapPage() {
  const map = await getMap()
  const plan =
    map?.planImage && typeof map.planImage === 'object'
      ? (map.planImage as { url?: string | null; alt?: string | null })
      : null
  const points: Point[] = Array.isArray(map?.points) ? (map!.points as Point[]) : []

  // Группируем объекты по типу в порядке MAP_TYPE_ORDER.
  const grouped = MAP_TYPE_ORDER.map((type) => ({
    type,
    meta: MAP_TYPE[type],
    items: points.filter((p) => (p.type ?? 'other') === type && p.label),
  })).filter((g) => g.items.length > 0)

  return (
    <main>
      <section className="section">
        <div className="section-inner">
          <SectionHeading eyebrow="Ориентируйтесь на месте" title="Карта фестиваля" />
          {map?.intro && <p className="section-lead">{map.intro}</p>}

          {plan?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="map-plan" src={plan.url} alt={plan.alt || 'План территории фестиваля'} />
      ) : (
        <div className="placeholder">
          План территории появится ближе к фестивалю. Загляните позже.
        </div>
      )}

      {grouped.length > 0 && (
        <section className="map-legend" aria-label="Объекты на территории">
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

      {!plan?.url && grouped.length === 0 && (
        <p className="meta" style={{ marginTop: '1rem' }}>
          Объекты появятся, когда организаторы заполнят карту в админке.
        </p>
      )}
        </div>
      </section>
    </main>
  )
}
