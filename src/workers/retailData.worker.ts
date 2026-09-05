import Papa from 'papaparse'

type RawRow = Record<string, string>
const numberValue = (value: string) => Number.parseFloat(value) || 0
const textValue = (value: string) => value?.trim() || 'Unknown'
function normalize(row: RawRow) {
  return { date: new Date(row['Order Date']), sales: numberValue(row.Sales), profit: numberValue(row['Order Profit Per Order']), orderId: textValue(row['Order Id']), customerId: textValue(row['Customer Id']), category: textValue(row['Category Name']), department: textValue(row['Department Name']), product: textValue(row['Product Name']), market: textValue(row.Market), region: textValue(row['Order Region']), country: textValue(row['Order Country']), segment: textValue(row['Customer Segment']), shippingMode: textValue(row['Shipping Mode']), deliveryStatus: textValue(row['Delivery Status']), orderStatus: textValue(row['Order Status']), type: textValue(row.Type), late: numberValue(row.Late_delivery_risk), actualDays: numberValue(row['Days for shipping (real)']), scheduledDays: numberValue(row['Days for shipment (scheduled)']), quantity: numberValue(row['Order Item Quantity']), discount: numberValue(row['Order Item Discount']), discountRate: numberValue(row['Order Item Discount Rate']) }
}
self.onmessage = async () => {
  try {
    const response = await fetch('/DataCo_Retail_Processed.csv')
    if (!response.ok || !response.body) throw new Error(`Dataset request failed (${response.status}).`)
    const length = Number(response.headers.get('content-length')) || 0, reader = response.body.getReader(), decoder = new TextDecoder()
    let received = 0, source = ''
    while (true) { const { done, value } = await reader.read(); if (done) break; received += value.byteLength; source += decoder.decode(value, { stream: true }); self.postMessage({ type: 'progress', phase: 'Downloading dataset', percent: length ? Math.round(received / length * 45) : 0 }) }
    source += decoder.decode()
    let processed = 0
    Papa.parse<RawRow>(source, { header: true, skipEmptyLines: true, chunkSize: 1024 * 1024,
      chunk: ({ data }) => { const batch = data.map(normalize).filter(row => !Number.isNaN(row.date.getTime())); processed += batch.length; self.postMessage({ type: 'batch', rows: batch }); self.postMessage({ type: 'progress', phase: 'Processing transactions', percent: Math.min(99, 45 + Math.round(processed / 180519 * 54)), rows: processed }) },
      complete: () => self.postMessage({ type: 'complete', rows: processed }),
      error: error => self.postMessage({ type: 'error', message: `Could not parse the retail dataset: ${error.message}` }),
    })
  } catch (error) { self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Unable to load the retail dataset.' }) }
}
