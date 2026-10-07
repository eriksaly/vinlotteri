import type { WineProduct } from '../types'

// Shared by the VG reviews list and the product page

// Created once: toLocaleString with options builds a new formatter on every call, which adds up
// over ~950 rows on every render
const centilitres = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })
const litresFormat = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })
export const twoDecimals = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const dateTime = new Intl.DateTimeFormat('nb-NO', { dateStyle: 'short', timeStyle: 'short' })

// 0.75 → "75 cl", 1.5 → "1,5 l"
export function formatVolume(litres: number) {
  return litres < 1 ? `${centilitres.format(litres * 100)} cl` : `${litresFormat.format(litres)} l`
}

// Stock at Vinmonopolet Horten, with when it was checked on hover
export function HortenStock({ p }: { p: WineProduct }) {
  return (
    <span title={p.stockCheckedAt ? `Sjekket ${dateTime.format(new Date(p.stockCheckedAt))}` : 'Ikke sjekket ennå'}>
      {p.inStock == null ? (
        <span style={{ color: 'var(--text-muted)' }}>—</span>
      ) : p.inStock ? (
        <span className="badge badge-green">{p.hortenStock != null ? `${p.hortenStock} stk` : 'På lager'}</span>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ikke på lager</span>
      )}
    </span>
  )
}
