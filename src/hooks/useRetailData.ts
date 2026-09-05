import { useEffect, useState } from 'react'
import type { RetailRow } from '../types/retail'
export let latestRetailData: RetailRow[] = []
type LoadState = { phase: string; percent: number; rows: number }
export function useRetailData() {
  const [data, setData] = useState<RetailRow[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<LoadState>({ phase: 'Starting dataset loader', percent: 0, rows: 0 })
  useEffect(() => {
    const worker = new Worker(new URL('../workers/retailData.worker.ts', import.meta.url), { type: 'module' }); const rows: RetailRow[] = []
    worker.onmessage = ({ data: message }) => {
      if (message.type === 'batch') rows.push(...message.rows)
      if (message.type === 'progress') setProgress({ phase: message.phase, percent: message.percent, rows: message.rows ?? rows.length })
      if (message.type === 'complete') { latestRetailData = rows; window.dispatchEvent(new Event('retail-data-ready')); setData(rows); setProgress({ phase: 'Ready', percent: 100, rows: message.rows }); setLoading(false); worker.terminate() }
      if (message.type === 'error') { setError(message.message); setLoading(false); worker.terminate() }
    }
    worker.onerror = event => { setError(`The data worker stopped unexpectedly: ${event.message || 'unknown error'}`); setLoading(false); worker.terminate() }
    worker.postMessage({ type: 'load' }); return () => worker.terminate()
  }, [])
  return { data, error, loading, progress }
}
