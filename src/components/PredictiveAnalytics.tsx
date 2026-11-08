import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BrainCircuit, ChevronLeft, ChevronRight, CircleCheck, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { ChartCard } from './ChartCard'
import { displayCountryName } from '../utils/countryNames'
import { number, pct } from '../utils/formatting'
import {
  calculateThresholdMetrics,
  classifyPrediction,
  DEFAULT_PREDICTION_THRESHOLD,
  emptyRiskFilters,
  HistoricalPrediction,
  matchesRiskFilters,
  predictedLate,
  PredictionCell,
  RiskFilters,
} from '../utils/predictiveAnalytics'

type Comparison = {
  model: string
  accuracy: number
  precision: number
  recall: number
  f1: number
  roc_auc: number
}

type Metadata = {
  model: string
  modelVersion: string
  predictionTarget: string
  threshold: number
  unitOfAnalysis: string
  status: string
  evaluationPeriod: string
  records: number
  testMetrics: { rocAuc: number; precision: number; recall: number; f1: number }
  featureImportance: { feature: string; importance: number }[]
  limitations: string[]
  modelComparison: Comparison[]
}

const PAGE_SIZE = 20
const cellNames: Record<PredictionCell, string> = { tp: 'True positive', fp: 'False positive', tn: 'True negative', fn: 'False negative' }
const cellText: Record<PredictionCell, string> = {
  tp: 'Correctly flagged late delivery',
  fp: 'False alert',
  tn: 'Correctly identified as not late',
  fn: 'Missed late delivery',
}
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const options = (values: (string | undefined)[]) => [...new Set(values.filter(Boolean) as string[])].sort()

export function PredictiveAnalytics() {
  const [metadata, setMetadata] = useState<Metadata>()
  const [rows, setRows] = useState<HistoricalPrediction[]>([])
  const [error, setError] = useState('')
  const [threshold, setThreshold] = useState(DEFAULT_PREDICTION_THRESHOLD)
  const [filters, setFilters] = useState<RiskFilters>(emptyRiskFilters)
  const [cell, setCell] = useState<PredictionCell | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'probability' | 'orderId'>('probability')
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState<HistoricalPrediction | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/predictive/v1/model-evaluation.json'),
      fetch('/predictive/v1/historical-predictions.json'),
    ])
      .then(async responses => {
        if (responses.some(response => !response.ok)) throw new Error('Historical prediction artifacts are unavailable.')
        return Promise.all(responses.map(response => response.json()))
      })
      .then(([meta, records]) => {
        if (active) {
          setMetadata(meta as Metadata)
          setRows(records as HistoricalPrediction[])
        }
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load prediction artifacts.')
      })
    return () => { active = false }
  }, [])

  const metrics = useMemo(() => calculateThresholdMetrics(rows, threshold), [rows, threshold])
  const explored = useMemo(() => rows.filter(row => matchesRiskFilters(row, filters, threshold)), [rows, filters, threshold])
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return explored
      .filter(row => (!cell || classifyPrediction(row, threshold) === cell) && row.orderId.toLowerCase().includes(term))
      .sort((a, b) => sort === 'probability' ? b.probability - a.probability : a.orderId.localeCompare(b.orderId))
  }, [explored, cell, threshold, query, sort])
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const pageRows = useMemo(() => visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [visible, page])
  const distribution = useMemo(() => Array.from({ length: 10 }, (_, index) => {
    const low = index / 10
    const high = (index + 1) / 10
    return {
      range: `${index * 10}–${(index + 1) * 10}%`,
      count: explored.filter(row => row.probability >= low && (index === 9 ? row.probability <= high : row.probability < high)).length,
    }
  }), [explored])
  const outcome = useMemo(() => [
    { name: 'Actual late', value: explored.filter(row => row.actual === 1).length, fill: '#f59e0b' },
    { name: 'Flagged late', value: explored.filter(row => predictedLate(row, threshold)).length, fill: '#38bdf8' },
  ], [explored, threshold])
  const filterOptions = useMemo(() => ({
    shippingMode: options(rows.map(row => row.shippingMode)),
    market: options(rows.map(row => row.market)),
    region: options(rows.map(row => row.region)),
    country: options(rows.map(row => row.country)),
  }), [rows])
  const countryLabels = useMemo(() => Object.fromEntries(filterOptions.country.map(value => [value, displayCountryName(value)])), [filterOptions.country])
  const shippingBase = useMemo(() => rows.filter(row => matchesRiskFilters(row, { ...filters, shippingMode: 'all' }, threshold)), [rows, filters, threshold])
  const shipping = useMemo(() => options(shippingBase.map(row => row.shippingMode)).map(shippingMode => {
    const group = shippingBase.filter(row => row.shippingMode === shippingMode)
    const result = calculateThresholdMetrics(group, threshold)
    return {
      shippingMode,
      group,
      result,
      observed: group.length ? group.filter(row => row.actual === 1).length / group.length : 0,
      mean: group.length ? group.reduce((sum, row) => sum + row.probability, 0) / group.length : 0,
    }
  }), [shippingBase, threshold])

  useEffect(() => setPage(0), [filters, cell, query, sort, threshold])

  const setFilter = <K extends keyof RiskFilters>(key: K, value: RiskFilters[K]) => {
    setFilters(current => ({ ...current, [key]: value }))
    setDetail(null)
  }
  const resetExplorer = () => {
    setFilters(emptyRiskFilters)
    setCell(null)
    setQuery('')
    setDetail(null)
  }

  if (error) return <section id="predictive-analytics" className="predictive-page"><h2>Predictive Analytics</h2><div className="predictive-error"><AlertTriangle size={18} /><div><strong>Historical prediction data unavailable</strong><p>{error} This page does not generate browser-side predictions.</p></div></div></section>
  if (!metadata) return <section id="predictive-analytics" className="predictive-page"><h2>Predictive Analytics</h2><p className="predictive-loading">Loading verified historical model evaluation…</p></section>

  return <section id="predictive-analytics" className="predictive-page">
    <div className="predictive-heading"><div><span>Research prototype · historical evaluation</span><h2>Predictive Intelligence</h2><p>Interact with saved Random Forest test-period results. Retail dashboard global filters remain independent of this full-period historical evaluation.</p></div><div className="prototype-badge"><BrainCircuit size={18} /><span>{metadata.status}</span></div></div>
    <div className="predictive-overview"><Info label="Model" value={metadata.model} note={metadata.modelVersion} /><Info label="Prediction target" value={metadata.predictionTarget} note={metadata.unitOfAnalysis} /><Info label="Operating threshold" value={metadata.threshold.toFixed(2)} note="Fixed historical policy" /><Info label="Evaluation period" value={metadata.evaluationPeriod} note={`${number(metadata.records)} historical orders`} /></div>
    <h3 className="predictive-section-title">Historical test-period performance</h3><p className="predictive-note">These fixed, saved metrics describe the held-out historical period—not live production performance.</p><div className="predictive-metrics"><Fixed label="ROC-AUC" value={metadata.testMetrics.rocAuc.toFixed(4)} /><Fixed label="Precision" value={pct(metadata.testMetrics.precision)} /><Fixed label="Recall" value={pct(metadata.testMetrics.recall)} /><Fixed label="F1-score" value={pct(metadata.testMetrics.f1)} /></div>

    <ChartCard title="Decision Threshold Simulator"><div className="threshold-simulator"><div><span className="eyebrow">Retrospective what-if analysis</span><h3>Explore the classification policy without retraining</h3><p>Saved probabilities are reclassified in the browser. This does not alter the official 0.50 threshold, model metadata, or validation evidence.</p></div><div className="threshold-control"><div><label htmlFor="prediction-threshold">Simulated threshold <strong>{threshold.toFixed(2)}</strong></label><button className="subtle-button" onClick={() => setThreshold(DEFAULT_PREDICTION_THRESHOLD)} disabled={threshold === DEFAULT_PREDICTION_THRESHOLD}><RotateCcw size={14} /> Reset to 0.50</button></div><input id="prediction-threshold" type="range" min="0.05" max="0.95" step="0.01" value={threshold} onChange={event => setThreshold(Number(event.target.value))} /><div className="range-labels"><span>0.05 · more alerts</span><span>0.95 · fewer alerts</span></div></div></div><div className="simulator-metrics"><Sim label="Flagged orders" value={number(metrics.flagged)} note={`${pct(metrics.alertRate)} alert rate`} /><Sim label="Precision" value={pct(metrics.precision)} /><Sim label="Recall" value={pct(metrics.recall)} /><Sim label="F1-score" value={pct(metrics.f1)} /><Sim label="Specificity" value={pct(metrics.specificity)} /></div></ChartCard>

    <ChartCard title="Historical Risk Explorer"><div className="explorer-head"><div><span className="eyebrow">Saved test-period orders</span><p><strong>{number(explored.length)}</strong> matching historical orders. Predictive controls do not apply the retail dashboard’s global filters.</p></div><button className="subtle-button" onClick={resetExplorer}><RotateCcw size={14} /> Reset explorer</button></div><div className="risk-filters"><Choice label="Shipping mode" value={filters.shippingMode} options={filterOptions.shippingMode} onChange={value => setFilter('shippingMode', value)} /><Choice label="Market" value={filters.market} options={filterOptions.market} onChange={value => setFilter('market', value)} /><Choice label="Region" value={filters.region} options={filterOptions.region} onChange={value => setFilter('region', value)} /><Choice label="Country" value={filters.country} options={filterOptions.country} labels={countryLabels} onChange={value => setFilter('country', value)} /><Choice label="Actual outcome" value={filters.actual} options={['late', 'not-late']} labels={{ late: 'Late delivery', 'not-late': 'Not late' }} onChange={value => setFilter('actual', value as RiskFilters['actual'])} /><Choice label="Predicted outcome" value={filters.predicted} options={['late', 'not-late']} labels={{ late: 'Predicted late', 'not-late': 'Predicted not late' }} onChange={value => setFilter('predicted', value as RiskFilters['predicted'])} /><Choice label="Probability range" value={filters.probabilityBand} options={['0-0.25', '0.25-0.5', '0.5-0.75', '0.75-1']} labels={{ '0-0.25': '0–25%', '0.25-0.5': '25–50%', '0.5-0.75': '50–75%', '0.75-1': '75–100%' }} onChange={value => setFilter('probabilityBand', value)} /></div></ChartCard>

    <div className="grid two predictive-grid"><ChartCard title="Probability Distribution"><ResponsiveContainer width="100%" height={260}><BarChart data={distribution}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="range" /><YAxis tickFormatter={number} /><Tooltip formatter={(value: number) => number(value)} /><Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer><p className="predictive-chart-note">Distribution reflects the currently filtered historical orders.</p></ChartCard><ChartCard title="Actual vs Predicted Outcomes"><ResponsiveContainer width="100%" height={260}><BarChart data={outcome}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis tickFormatter={number} /><Tooltip formatter={(value: number) => number(value)} /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{outcome.map(item => <Cell key={item.name} fill={item.fill} />)}</Bar></BarChart></ResponsiveContainer><p className="predictive-chart-note">{number(metrics.flagged)} orders are flagged at simulated threshold {threshold.toFixed(2)}; historical actuals are unchanged.</p></ChartCard></div>

    <div className="grid two predictive-grid"><ChartCard title="Interactive Confusion Matrix"><p className="predictive-chart-note">At simulated threshold {threshold.toFixed(2)}. Select a cell to focus the order table.</p><div className="confusion-matrix interactive">{(['tn', 'fp', 'fn', 'tp'] as PredictionCell[]).map(kind => <button key={kind} className={[kind === 'tp' || kind === 'tn' ? 'good' : 'warn', cell === kind ? 'selected' : ''].join(' ')} onClick={() => setCell(current => current === kind ? null : kind)} aria-pressed={cell === kind}><small>{cellNames[kind]}</small><b>{number(metrics[kind])}</b><span>{cellText[kind]}</span></button>)}</div>{cell && <button className="clear-cell" onClick={() => setCell(null)}><X size={14} /> Clear {cellNames[cell]} selection</button>}</ChartCard><ChartCard title="Validation Model Comparison"><p className="predictive-chart-note">Validation-period comparison from the saved model evaluation artifact.</p><div className="model-comparison"><div className="model-comparison-heading"><strong>Model</strong><span>ROC-AUC</span><span>Accuracy</span><span>Precision</span><span>Recall</span><span>F1</span></div>{metadata.modelComparison.map(item => <div key={item.model} className={item.model === 'forest' ? 'selected' : ''}><strong>{label(item.model)}</strong><span>{item.roc_auc.toFixed(4)}</span><span>{pct(item.accuracy)}</span><span>{pct(item.precision)}</span><span>{pct(item.recall)}</span><span>{pct(item.f1)}</span></div>)}</div></ChartCard></div>

    <ChartCard title="Shipping Mode Risk Comparison"><div className="shipping-intro"><p>Observed outcomes and saved probabilities by historical shipping mode at the simulated threshold. Shipping mode supplies most observed discrimination in the robustness experiment; this association does not establish causality.</p><span>{number(shippingBase.length)} orders after other explorer filters</span></div><div className="table-wrap"><table className="shipping-table"><thead><tr><th>Shipping mode</th><th>Orders</th><th>Observed late</th><th>Mean probability</th><th>Flagged</th><th>Precision</th><th>Recall</th></tr></thead><tbody>{shipping.map(item => <tr key={item.shippingMode} className={filters.shippingMode === item.shippingMode ? 'active-row' : ''} onClick={() => setFilter('shippingMode', filters.shippingMode === item.shippingMode ? 'all' : item.shippingMode)}><td><button className="table-link" type="button">{item.shippingMode}</button></td><td>{number(item.group.length)}</td><td>{pct(item.observed)}</td><td>{pct(item.mean)}</td><td>{pct(item.result.alertRate)}</td><td>{item.result.flagged ? pct(item.result.precision) : '—'}</td><td>{item.result.tp + item.result.fn ? pct(item.result.recall) : '—'}</td></tr>)}</tbody></table></div></ChartCard>

    <div className="grid two predictive-grid"><ChartCard title="Permutation Feature Importance"><div className="importance-explainer"><SlidersHorizontal size={16} /><span>Measured validation ROC-AUC decrease after permuting each feature. Larger decreases indicate greater observed model reliance.</span></div><ResponsiveContainer width="100%" height={310}><BarChart data={metadata.featureImportance.slice(0, 7)} layout="vertical" margin={{ left: 18 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(value: number) => value.toFixed(4)} /><YAxis dataKey="feature" type="category" width={125} tickFormatter={label} /><Tooltip formatter={(value: number) => value.toFixed(4)} labelFormatter={label} /><Bar dataKey="importance" fill="#22c55e" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer><p className="predictive-chart-note">Shipping mode dominates the current model’s discrimination. Permutation importance is not a causal or individual-order explanation.</p></ChartCard><ChartCard title="Model Limitations"><ul className="predictive-limitations">{metadata.limitations.map(item => <li key={item}><AlertTriangle size={14} />{item}</li>)}</ul><h4>Research interpretation</h4><p className="predictive-chart-note">The module is a retrospective decision-support view, not a live service or a claim that deploying this model improves delivery performance.</p></ChartCard></div>

    <ChartCard title="Historical Order Risk Inspector"><div className="prediction-table-tools"><p>{cell ? `${cellNames[cell]} orders only · ` : ''}{number(visible.length)} matching historical records. Selecting a row opens saved order context, not an individual model explanation.</p><label><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search order ID" aria-label="Search historical order ID" /></label><button className="subtle-button" onClick={() => setSort(current => current === 'probability' ? 'orderId' : 'probability')}>Sort by {sort === 'probability' ? 'order ID' : 'probability'}</button></div><div className="table-wrap"><table className="prediction-table"><thead><tr><th>Order ID</th><th>Shipping mode</th><th>Probability</th><th>Predicted outcome</th><th>Actual outcome</th><th>Classification</th></tr></thead><tbody>{pageRows.map(row => { const kind = classifyPrediction(row, threshold); return <tr key={row.orderId} onClick={() => setDetail(row)} className={detail?.orderId === row.orderId ? 'active-row' : ''}><td><button className="table-link" type="button">{row.orderId}</button></td><td>{row.shippingMode || '—'}</td><td>{pct(row.probability)}</td><td><Outcome value={predictedLate(row, threshold)} /></td><td><Outcome value={row.actual === 1} /></td><td><span className={`classification ${kind}`}>{cellText[kind]}</span></td></tr> })}</tbody></table></div><div className="pagination"><button className="subtle-button" disabled={page === 0} onClick={() => setPage(current => current - 1)}><ChevronLeft size={15} /> Previous</button><span>Page {page + 1} of {pageCount}</span><button className="subtle-button" disabled={page + 1 >= pageCount} onClick={() => setPage(current => current + 1)}>Next <ChevronRight size={15} /></button></div></ChartCard>
    {detail && <OrderDetail row={detail} threshold={threshold} close={() => setDetail(null)} />}
  </section>
}

function Info({ label, value, note }: { label: string; value: string; note: string }) { return <article><small>{label}</small><strong>{value}</strong><span>{note}</span></article> }
function Fixed({ label, value }: { label: string; value: string }) { return <article><CircleCheck size={17} /><small>{label}</small><strong>{value}</strong><span>Fixed historical period</span></article> }
function Sim({ label, value, note }: { label: string; value: string; note?: string }) { return <article><small>{label}</small><strong>{value}</strong>{note && <span>{note}</span>}</article> }
function Outcome({ value }: { value: boolean }) { return <span className={value ? 'prediction-positive' : 'prediction-negative'}>{value ? 'Late delivery' : 'Not late'}</span> }
function Choice({ label, value, options, onChange, labels = {} }: { label: string; value: string; options: string[]; onChange: (value: string) => void; labels?: Record<string, string> }) { return <label className="filter-select"><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}><option value="all">All</option>{options.map(option => <option key={option} value={option}>{labels[option] || option}</option>)}</select></label> }

function OrderDetail({ row, threshold, close }: { row: HistoricalPrediction; threshold: number; close: () => void }) {
  const details: [string, string | undefined][] = [
    ['Predicted outcome', predictedLate(row, threshold) ? 'Late delivery' : 'Not late'],
    ['Actual outcome', row.actual ? 'Late delivery' : 'Not late'],
    ['Classification', cellText[classifyPrediction(row, threshold)]],
    ['Shipping mode', row.shippingMode],
    ['Market', row.market],
    ['Region', row.region],
    ['Country', row.country ? displayCountryName(row.country) : undefined],
    ['Customer segment', row.customerSegment],
    ['Category', row.category],
    ['Order value', row.orderValue ? '$' + Number(row.orderValue).toLocaleString(undefined, { maximumFractionDigits: 2 }) : undefined],
    ['Quantity', row.quantity],
    ['Order date', row.orderDate],
  ]
  return <aside className="order-inspector" aria-label={`Historical order ${row.orderId} details`}><div><span className="eyebrow">Historical order detail</span><h3>Order {row.orderId}</h3><p>Saved evaluation context only. This panel does not assert an individual reason for the prediction.</p></div><button className="icon-button" type="button" onClick={close} aria-label="Close order details"><X size={18} /></button><div className="probability-indicator"><div><span>Predicted late-delivery probability</span><strong>{pct(row.probability)}</strong></div><div className="probability-track"><i style={{ width: `${row.probability * 100}%` }} /><em style={{ left: `${threshold * 100}%` }} /></div><small>Simulated threshold: {threshold.toFixed(2)}</small></div><div className="order-detail-grid">{details.map(([name, value]) => <div key={name}><small>{name}</small><strong>{value || '—'}</strong></div>)}</div></aside>
}
