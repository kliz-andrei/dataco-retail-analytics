import type { ReactNode } from 'react'
export function ChartCard({title,children,className=''}:{title:string;children:ReactNode;className?:string}){return <article className={`chart-card ${className}`}><h3>{title}</h3>{children}</article>}
