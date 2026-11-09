import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BrainCircuit, LoaderCircle, RotateCcw, Send } from 'lucide-react'
import { ChartCard } from './ChartCard'
import { displayCountryName } from '../utils/countryNames'
import { pct } from '../utils/formatting'
import './lateDeliveryEstimator.css'

type FeatureOptions = {
  features: string[]
  categorical: Record<string, string[]>
  numeric: {
    defaults: Record<string, number>
    limits: Record<string, { min: number; max: number }>
  }
  categoricalDefaults: Record<string, string>
  modelVersion: string
}

type EstimatorForm = Record<string, string>

type EstimatorResult = {
  probability: number
  predictedLate: boolean
  threshold: number
  model: string
  modelVersion: string
  predictionTarget: string
  interpretation: string
  limitations: string[]
}

const categoricalFields = ['shipping_mode', 'market', 'region', 'country', 'customer_segment', 'category']
const fieldLabels: Record<string, string> = {
  shipping_mode: 'Shipping mode',
  market: 'Market',
  region: 'Region',
  country: 'Country',
  customer_segment: 'Customer segment',
  category: 'Product category',
  quantity: 'Order quantity',
  order_value: 'Order value',
  order_month: 'Order month',
}

function makeDefaultForm(options: FeatureOptions): EstimatorForm {
  const form: EstimatorForm = {}
  categoricalFields.forEach(field => { form[field] = options.categoricalDefaults[field] || options.categorical[field]?.[0] || '' })
  Object.entries(options.numeric.defaults).forEach(([field, value]) => { form[field] = String(value) })
  return form
}

function errorMessage(payload: unknown) {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
  }
  return 'The inference service could not score this order. Check the inputs and try again.'
}

export function LateDeliveryEstimator() {
  const [options, setOptions] = useState<FeatureOptions>()
  const [form, setForm] = useState<EstimatorForm>({})
  const [result, setResult] = useState<EstimatorResult>()
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingPrediction, setLoadingPrediction] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/options')
      .then(async response => {
        const body = await response.json().catch(() => undefined)
        if (!response.ok) throw new Error(errorMessage(body))
        return body as FeatureOptions
      })
      .then(payload => {
        if (!active) return
        setOptions(payload)
        setForm(makeDefaultForm(payload))
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'The inference service is unavailable.')
      })
      .finally(() => { if (active) setLoadingOptions(false) })
    return () => { active = false }
  }, [])

  const countryLabels = useMemo(() => Object.fromEntries((options?.categorical.country || []).map(value => [value, displayCountryName(value)])), [options])
  const updateField = (field: string, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
    setResult(undefined)
    setError('')
  }
  const reset = () => {
    if (options) setForm(makeDefaultForm(options))
    setResult(undefined)
    setError('')
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!options) return
    setLoadingPrediction(true)
    setError('')
    setResult(undefined)
    const payload = {
      ...form,
      quantity: Number(form.quantity),
      order_value: Number(form.order_value),
      order_month: Number(form.order_month),
    }
    try {
      const response = await fetch('/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await response.json().catch(() => undefined)
      if (!response.ok) throw new Error(errorMessage(body))
      setResult(body as EstimatorResult)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The inference service is unavailable.')
    } finally {
      setLoadingPrediction(false)
    }
  }

  return <ChartCard title="Late-Delivery Risk Estimator">
    <div className="estimator-intro">
      <div><span className="eyebrow">Interactive model inference</span><p>Enter order-placement information to score one hypothetical order with the verified Random Forest pipeline. This is separate from the saved historical evaluation above.</p></div>
      <span className="estimator-disclosure"><AlertTriangle size={14} />Research prototype · not a live delivery forecast</span>
    </div>
    {loadingOptions && <div className="estimator-state"><LoaderCircle size={16} className="spin" /> Loading the model feature schema…</div>}
    {!loadingOptions && !options && <div className="estimator-state error"><AlertTriangle size={16} /><span>Interactive inference is unavailable: {error || 'the API did not return a feature schema.'}<small>Historical metrics and saved order analysis remain available above.</small></span></div>}
    {options && <>
      <form className="estimator-form" onSubmit={submit}>
        {categoricalFields.map(field => <label key={field} className="estimator-field"><span>{fieldLabels[field]}</span><select required value={form[field] || ''} onChange={event => updateField(field, event.target.value)}>{(options.categorical[field] || []).map(value => <option key={value} value={value}>{field === 'country' ? (countryLabels[value] || value) : value}</option>)}</select></label>)}
        <label className="estimator-field"><span>Order quantity</span><input required type="number" min={options.numeric.limits.quantity.min} max={options.numeric.limits.quantity.max} step="1" value={form.quantity || ''} onChange={event => updateField('quantity', event.target.value)} /></label>
        <label className="estimator-field"><span>Order value</span><input required type="number" min={options.numeric.limits.order_value.min} max={options.numeric.limits.order_value.max} step="any" value={form.order_value || ''} onChange={event => updateField('order_value', event.target.value)} /></label>
        <label className="estimator-field"><span>Order month</span><input required type="number" min={options.numeric.limits.order_month.min} max={options.numeric.limits.order_month.max} step="1" value={form.order_month || ''} onChange={event => updateField('order_month', event.target.value)} /></label>
        <div className="estimator-actions"><button className="subtle-button" type="button" onClick={reset}><RotateCcw size={14} /> Reset defaults</button><button className="primary-button" type="submit" disabled={loadingPrediction}>{loadingPrediction ? <><LoaderCircle size={14} className="spin" /> Scoring…</> : <><Send size={14} /> Estimate risk</>}</button></div>
      </form>
      <p className="estimator-default-note">Defaults are derived from the fitted training schema’s most-frequent categorical values and numeric medians; they do not represent a real customer order.</p>
      {error && <div className="estimator-inline-error"><AlertTriangle size={15} />{error}</div>}
      {result && <div className={`estimator-result ${result.predictedLate ? 'late' : 'not-late'}`} aria-live="polite"><div className="estimator-score"><span>Model-estimated late-delivery score</span><strong>{pct(result.probability)}</strong><div className="estimator-track"><i style={{ width: `${Math.max(0, Math.min(1, result.probability)) * 100}%` }} /><em style={{ left: `${result.threshold * 100}%` }} /></div></div><div className="estimator-decision"><small>Classification at {result.threshold.toFixed(2)}</small><strong>{result.predictedLate ? 'Late delivery' : 'Not late'}</strong><span>{result.model} · {result.modelVersion}</span></div><p>{result.interpretation}</p><ul>{result.limitations.map(item => <li key={item}>{item}</li>)}</ul></div>}
    </>}
  </ChartCard>
}
