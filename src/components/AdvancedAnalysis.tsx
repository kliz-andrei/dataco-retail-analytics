import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { latestRetailData } from '../hooks/useRetailData'
import { money, number, pct } from '../utils/formatting'
type Metric='sales'|'profit'|'quantity'|'actualDays'|'discountRate'
const labels:Record<Metric,string>={sales:'Sales',profit:'Profit',quantity:'Quantity',actualDays:'Shipping days',discountRate:'Discount rate'}
const quantile=(items:number[],q:number)=>items[Math.floor((items.length-1)*q)]||0
const format=(metric:Metric,value:number)=>metric==='sales'||metric==='profit'?money(value):metric==='discountRate'?pct(value):metric==='quantity'?number(value):value.toFixed(1)
export function AdvancedAnalysis(){
  const [ready,setReady]=useState(()=>latestRetailData.length>0),[open,setOpen]=useState(false),[metric,setMetric]=useState<Metric>('sales')
  useEffect(()=>{const loaded=()=>setReady(true);addEventListener('retail-data-ready',loaded);return()=>removeEventListener('retail-data-ready',loaded)},[])
  const stats=useMemo(()=>{if(!ready)return null;const values=latestRetailData.map(row=>row[metric] as number).filter(Number.isFinite).sort((a,b)=>a-b);if(!values.length)return null;const mean=values.reduce((a,b)=>a+b,0)/values.length,variance=values.reduce((a,b)=>a+(b-mean)**2,0)/values.length;return{count:values.length,mean,median:quantile(values,.5),min:values[0],max:values[values.length-1],std:Math.sqrt(variance),q1:quantile(values,.25),q3:quantile(values,.75)}},[metric,ready])
  if(!ready)return null
  return <section className="advanced-analysis"><button className="advanced-toggle" onClick={()=>setOpen(!open)} aria-expanded={open}><span><BarChart3 size={16}/> Advanced Analysis</span>{open?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button>{open&&<div className="stat-panel"><div><span className="stat-kicker">Descriptive statistics</span><p>Explore measures from the loaded retail records.</p></div><label>Metric<select value={metric} onChange={e=>setMetric(e.target.value as Metric)}>{(Object.keys(labels) as Metric[]).map(key=><option key={key} value={key}>{labels[key]}</option>)}</select></label>{stats&&<div className="stat-grid">{[['Records',number(stats.count)],['Mean',format(metric,stats.mean)],['Median',format(metric,stats.median)],['Minimum',format(metric,stats.min)],['Maximum',format(metric,stats.max)],['Std. deviation',format(metric,stats.std)],['25th percentile',format(metric,stats.q1)],['75th percentile',format(metric,stats.q3)]].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>}</div>}</section>
}
