import type { LucideIcon } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'

type SparkPoint = { name: string; [key: string]: string | number }
type Variant = 'sales' | 'profit' | 'orders' | 'customers' | 'aov' | 'risk'

const palette: Record<Variant, { stroke: string; fill: string }> = {
  sales: { stroke: '#38bdf8', fill: '#38bdf833' }, profit: { stroke: '#4ade80', fill: '#4ade8033' },
  orders: { stroke: '#a78bfa', fill: '#a78bfa33' }, customers: { stroke: '#06b6d4', fill: '#06b6d433' },
  aov: { stroke: '#fbbf24', fill: '#fbbf2433' }, risk: { stroke: '#fb7185', fill: '#fb718533' },
}

export function KPICard({ label, value, detail, trend, Icon, data, dataKey, variant = 'sales' }: { label: string; value: string; detail: string; trend?: number; Icon: LucideIcon; data: SparkPoint[]; dataKey: string; variant?: Variant }) {
  const direction = trend == null ? '' : trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat'
  const colors = palette[variant]
  return <article className={`kpi kpi-${variant}`}>
    <div className="kpi-header"><span className="kpi-icon"><Icon size={18}/></span><p className="kpi-title">{label}</p></div>
    <div className="kpi-metric"><strong className="kpi-value">{value}</strong><small className="kpi-description">{trend == null ? detail : <><em className={`trend ${direction}`}>{trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend * 100).toFixed(1)}%</em> vs previous period</>}</small></div>
    <div className="kpi-sparkline" aria-label={`${label} trend by selected time period`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}><defs><linearGradient id={`spark-${variant}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={colors.stroke} stopOpacity={.42}/><stop offset="100%" stopColor={colors.stroke} stopOpacity={0}/></linearGradient></defs><Tooltip cursor={false} content={({ active, payload }) => active && payload?.length ? <div className="spark-tooltip"><b>{payload[0].payload.name}</b><span>{Number(payload[0].value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div> : null}/><Area type="monotone" dataKey={dataKey} stroke={colors.stroke} fill={`url(#spark-${variant})`} strokeWidth={2} isAnimationActive animationDuration={360} dot={false} activeDot={{ r: 3, fill: colors.stroke }}/></AreaChart></ResponsiveContainer></div>
  </article>
}
