export const DEFAULT_PREDICTION_THRESHOLD = 0.5

export type PredictionCell = 'tp' | 'fp' | 'tn' | 'fn'

export type HistoricalPrediction = {
  orderId: string
  actual: number
  probability: number
  predicted: number
  shippingMode?: string
  market?: string
  region?: string
  country?: string
  customerSegment?: string
  category?: string
  quantity?: string
  orderValue?: string
  orderDate?: string
}

export type ThresholdMetrics = {
  tp: number
  fp: number
  tn: number
  fn: number
  precision: number
  recall: number
  f1: number
  specificity: number
  alertRate: number
  flagged: number
  total: number
}

export type RiskFilters = {
  shippingMode: string
  market: string
  region: string
  country: string
  actual: 'all' | 'late' | 'not-late'
  predicted: 'all' | 'late' | 'not-late'
  probabilityBand: string
}

export const emptyRiskFilters: RiskFilters = {
  shippingMode: 'all',
  market: 'all',
  region: 'all',
  country: 'all',
  actual: 'all',
  predicted: 'all',
  probabilityBand: 'all',
}

const ratio = (numerator: number, denominator: number) => denominator ? numerator / denominator : 0

export function predictedLate(row: HistoricalPrediction, threshold: number) {
  return row.probability >= threshold
}

export function classifyPrediction(row: HistoricalPrediction, threshold: number): PredictionCell {
  const predicted = predictedLate(row, threshold)
  if (row.actual === 1) return predicted ? 'tp' : 'fn'
  return predicted ? 'fp' : 'tn'
}

export function calculateThresholdMetrics(rows: HistoricalPrediction[], threshold: number): ThresholdMetrics {
  let tp = 0
  let fp = 0
  let tn = 0
  let fn = 0
  rows.forEach(row => {
    const cell = classifyPrediction(row, threshold)
    if (cell === 'tp') tp += 1
    if (cell === 'fp') fp += 1
    if (cell === 'tn') tn += 1
    if (cell === 'fn') fn += 1
  })
  const flagged = tp + fp
  const precision = ratio(tp, flagged)
  const recall = ratio(tp, tp + fn)
  return {
    tp, fp, tn, fn, flagged, total: rows.length,
    precision,
    recall,
    f1: ratio(2 * precision * recall, precision + recall),
    specificity: ratio(tn, tn + fp),
    alertRate: ratio(flagged, rows.length),
  }
}

export function matchesRiskFilters(row: HistoricalPrediction, filters: RiskFilters, threshold: number) {
  const predicted = predictedLate(row, threshold)
  const inBand = filters.probabilityBand === 'all' || (() => {
    const [from, to] = filters.probabilityBand.split('-').map(Number)
    return row.probability >= from && (to === 1 ? row.probability <= to : row.probability < to)
  })()
  return (filters.shippingMode === 'all' || row.shippingMode === filters.shippingMode)
    && (filters.market === 'all' || row.market === filters.market)
    && (filters.region === 'all' || row.region === filters.region)
    && (filters.country === 'all' || row.country === filters.country)
    && (filters.actual === 'all' || (filters.actual === 'late') === (row.actual === 1))
    && (filters.predicted === 'all' || (filters.predicted === 'late') === predicted)
    && inBand
}
