import { useEffect } from 'react'
export function ScrollReset(){useEffect(()=>{const reset=()=>window.scrollTo({top:0,behavior:'auto'});addEventListener('hashchange',reset);return()=>removeEventListener('hashchange',reset)},[]);return null}
