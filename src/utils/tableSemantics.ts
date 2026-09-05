export type MarginTone = 'healthy' | 'normal' | 'attention' | 'risk'
export type ProductMetric = { sales: number; profit: number }

const quantile = (values: number[], value: number) => values[Math.min(values.length - 1, Math.max(0, Math.floor((values.length - 1) * value)))] || 0

export function marginThresholds(rows: ProductMetric[]) {
  const values = rows.filter(row => row.sales > 0).map(row => row.profit / row.sales).sort((a, b) => a - b)
  return { risk: quantile(values, .1), attention: quantile(values, .35), healthy: quantile(values, .75) }
}

export function marginTone(value: number, thresholds: ReturnType<typeof marginThresholds>): MarginTone {
  if (value <= thresholds.risk) return 'risk'
  if (value <= thresholds.attention) return 'attention'
  if (value >= thresholds.healthy) return 'healthy'
  return 'normal'
}
