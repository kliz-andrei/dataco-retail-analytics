export const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2,minimumFractionDigits:0}).format(n)
export const fullMoney=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n)
export const number=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(n)
export const pct=(n:number)=>`${(n*100).toFixed(2)}%`
