import { useMemo, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { scaleQuantile } from 'd3-scale'
import { feature } from 'topojson-client'
import worldAtlas from 'world-atlas/countries-110m.json'
import type { RetailRow } from '../types/retail'
import { fullMoney, money } from '../utils/formatting'
import { countryNumericId, displayCountryName } from '../utils/countryNames'

const world = feature(worldAtlas as never, (worldAtlas as unknown as { objects: { countries: never } }).objects.countries) as unknown as { features: Array<{ id: string | number; properties: { name: string }; geometry: unknown }> }

export function GlobalSalesMap({ rows }: { rows: RetailRow[] }) {
  const [hovered, setHovered] = useState<{ name: string; sales: number; rank: number; x: number; y: number } | null>(null)
  const model = useMemo(() => {
    const byId = new Map<string, { name: string; sales: number }>(), unmatched = new Set<string>()
    for (const row of rows) {
      const numeric = countryNumericId(row.country)
      if (!numeric) { unmatched.add(row.country); continue }
      const id = String(numeric).padStart(3, '0'), current = byId.get(id) || { name: displayCountryName(row.country), sales: 0 }
      current.sales += row.sales; byId.set(id, current)
    }
    const ranked = [...byId.entries()].sort(([, a], [, b]) => b.sales - a.sales), values = ranked.map(([, item]) => item.sales), max = values[0] || 0, total = values.reduce((sum, value) => sum + value, 0)
    const rankById = new Map(ranked.map(([id], index) => [id, index + 1]))
    const scale = scaleQuantile<string>().domain(values).range(['#0B1F35', '#164E63', '#0EA5A8', '#F59E0B', '#EF4444'])
    return { byId, max, total, ranked, rankById, scale, thresholds: [values.at(-1) || 0, ...scale.quantiles(), max], unmatched: [...unmatched].sort() }
  }, [rows])
  const projection = useMemo(() => geoNaturalEarth1().fitSize([960, 430], { type: 'FeatureCollection', features: world.features } as never), [])
  const path = useMemo(() => geoPath(projection), [projection])
  const color = (sales: number) => sales && model.max ? model.scale(sales) : '#101A28'
  if (!rows.length) return <article className="chart-card chart-sales global-sales-map"><h3><i aria-hidden="true"/>Global Sales Map</h3><p className="chart-description">Sales distribution across countries</p><div className="map-empty"><strong>No geographic data available</strong><span>Try removing or changing one or more filters.</span></div></article>
  const top = model.ranked[0]?.[1]
  return <article className="chart-card chart-sales global-sales-map"><div className="map-heading"><div><h3><i aria-hidden="true"/>Global Sales Map</h3><p className="chart-description">Sales distribution across countries</p></div><div className="map-summary"><small>Top country</small><strong>{top?.name || '—'}</strong><b>{money(top?.sales || 0)}</b></div></div><div className="map-frame" onMouseLeave={() => setHovered(null)}><svg viewBox="0 0 960 430" role="img" aria-label="World map of filtered sales by country">{world.features.map(country => { const id = String(country.id).padStart(3, '0'), item = model.byId.get(id), sales = item?.sales || 0; return <path key={String(country.id)} d={path(country as never) || ''} fill={color(sales)} className={sales ? 'map-country has-data' : 'map-country'} onMouseMove={event => { if (!item) return; const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect(); if (box) setHovered({ name: item.name, sales, rank: model.rankById.get(id) || 0, x: event.clientX - box.left, y: event.clientY - box.top }) }} /> })}</svg>{hovered && <div className="map-tooltip" style={{ left: hovered.x, top: hovered.y }}><strong>{hovered.name}</strong><span>Sales <b>{fullMoney(hovered.sales)}</b></span><small>{(hovered.sales / (model.total || 1) * 100).toFixed(1)}% of filtered sales · Rank #{hovered.rank}</small></div>}</div><div className="map-footer"><div className="map-legend"><span>Sales heatmap</span><div className="map-swatch-row">{['#0B1F35','#164E63','#0EA5A8','#F59E0B','#EF4444'].map(color => <i key={color} style={{background:color}}/>)}</div><div className="map-legend-labels"><small>Lower sales</small><small>Higher sales</small></div><div className="map-thresholds">{model.thresholds.map((value,index)=><b key={index}>{money(value)}</b>)}</div><small className="map-no-data"><i/> No data</small></div><p>{model.max ? `${top?.name} leads filtered country sales.` : 'No geographic insight available for the current filters.'}</p>{model.unmatched.length > 0 && <small className="map-coverage">{model.unmatched.length} unmatched country name{model.unmatched.length === 1 ? '' : 's'} retained in the country ranking.</small>}</div></article>
}
