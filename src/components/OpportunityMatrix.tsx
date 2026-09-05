import { useMemo, useState } from 'react'
import { Cell, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { fullMoney, number } from '../utils/formatting'

export type OpportunityProduct = { name: string; category: string; sales: number; profit: number; quantity: number }
type Quadrant = 'High Sales - High Profit' | 'High Sales - Low Profit' | 'Low Sales - High Profit' | 'Low Sales - Low Profit'

const labels: Record<Quadrant, string> = { 'High Sales - High Profit': 'Invest', 'High Sales - Low Profit': 'Fix margin', 'Low Sales - High Profit': 'Grow selectively', 'Low Sales - Low Profit': 'Review' }
const colors: Record<Quadrant, string> = { 'High Sales - High Profit': '#22c55e', 'High Sales - Low Profit': '#f59e0b', 'Low Sales - High Profit': '#38bdf8', 'Low Sales - Low Profit': '#64748b' }
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2 }

export function OpportunityMatrix({ products }: { products: OpportunityProduct[] }) {
  const [selected, setSelected] = useState<Quadrant | 'All'>('All')
  const model = useMemo(() => {
    if (!products.length) return null
    const salesMedian = median(products.map(product => product.sales)), profitMedian = median(products.map(product => product.profit))
    const points = products.map(product => {
      const quadrant: Quadrant = product.sales >= salesMedian ? product.profit >= profitMedian ? 'High Sales - High Profit' : 'High Sales - Low Profit' : product.profit >= profitMedian ? 'Low Sales - High Profit' : 'Low Sales - Low Profit'
      return { ...product, quadrant }
    })
    return { salesMedian, profitMedian, points }
  }, [products])
  if (!model) return null
  const visible = selected === 'All' ? model.points : model.points.filter(point => point.quadrant === selected), quadrants = Object.keys(labels) as Quadrant[]
  return <section className="opportunity-matrix" aria-labelledby="opportunity-title">
    <div className="opportunity-heading"><div><span className="stat-kicker">Notebook-derived analysis</span><h2 id="opportunity-title">Retail Opportunity Matrix</h2><p>Products are classified against median sales and profit for the current filter selection.</p></div><div className="opportunity-thresholds"><span>Sales median <strong>{fullMoney(model.salesMedian)}</strong></span><span>Profit median <strong>{fullMoney(model.profitMedian)}</strong></span></div></div>
    <div className="opportunity-filters" role="group" aria-label="Filter product opportunity quadrant"><button className={selected === 'All' ? 'active' : ''} onClick={() => setSelected('All')}>All <b>{number(model.points.length)}</b></button>{quadrants.map(quadrant => <button key={quadrant} className={selected === quadrant ? 'active' : ''} onClick={() => setSelected(quadrant)}><i style={{ background: colors[quadrant] }} />{labels[quadrant]} <b>{number(model.points.filter(point => point.quadrant === quadrant).length)}</b></button>)}</div>
    <div className="opportunity-chart"><ResponsiveContainer width="100%" height={360}><ScatterChart margin={{ top: 16, right: 22, bottom: 18, left: 16 }}><XAxis type="number" dataKey="sales" name="Sales" tickFormatter={value => fullMoney(value)} label={{ value: 'Total sales', position: 'insideBottom', offset: -8 }} /><YAxis type="number" dataKey="profit" name="Profit" tickFormatter={value => fullMoney(value)} label={{ value: 'Total profit', angle: -90, position: 'insideLeft' }} /><ReferenceLine x={model.salesMedian} stroke="#64748b" strokeDasharray="5 5" /><ReferenceLine y={model.profitMedian} stroke="#64748b" strokeDasharray="5 5" /><Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: number, key: string) => [fullMoney(value), key === 'sales' ? 'Sales' : 'Profit']} labelFormatter={(_, payload) => payload?.[0]?.payload?.name || 'Product'} /><Scatter data={visible} fill="#38bdf8">{visible.map(point => <Cell key={point.name} fill={colors[point.quadrant]} />)}</Scatter></ScatterChart></ResponsiveContainer></div>
    <div className="opportunity-notes">{quadrants.map(quadrant => <div key={quadrant}><i style={{ background: colors[quadrant] }} /><strong>{labels[quadrant]}</strong><span>{quadrant}</span></div>)}</div>
  </section>
}
