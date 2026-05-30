import { useState, useEffect } from 'react'
import api from '../../api/client'
import type { VinmonopoletProduct, ShoppingSuggestions } from '../../types'

const CATEGORY_LABELS: Record<string, string> = {
  'Rødvin': '🍷 Rødvin',
  'Musserende vin': '🥂 Musserende vin',
  'Hvitvin': '🫧 Hvitvin',
  'Rosévin': '🌸 Rosévin',
  'Øl': '🍺 Øl',
  'Gin': '🌿 Gin',
  'Whisky': '🥃 Whisky',
  'Likør': '🍹 Likør',
  'Druebrennevin': '🍇 Druebrennevin',
  'Akevitt': '🇳🇴 Akevitt',
  'Brennevin': '🥃 Brennevin',
}

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS)

type Counts = { red: number; sparkling: number; white: number; rose: number; beer: number; spirits: number }

function defaultCounts(prizeCount: number): Counts {
  return {
    red: Math.max(0, prizeCount - 5),
    sparkling: 1,
    white: 1,
    rose: 1,
    beer: 3,
    spirits: 1,
  }
}

export default function ShoppingTab() {
  const [prizeCount, setPrizeCount] = useState<number | ''>(12)
  const [totalBudget, setTotalBudget] = useState<number | ''>('')
  const [lotteryCount, setLotteryCount] = useState<number | ''>(1)
  const [counts, setCounts] = useState<Counts>(defaultCounts(12))
  const [suggestions, setSuggestions] = useState<VinmonopoletProduct[] | null>(null)
  const [fetchingProducts, setFetchingProducts] = useState(false)
  const [addingToInventory, setAddingToInventory] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (prizeCount !== '') {
      setCounts(defaultCounts(Number(prizeCount)))
    }
  }, [prizeCount])

  const budgetPerLottery = totalBudget !== '' && lotteryCount !== '' && lotteryCount > 0
    ? Math.floor(Number(totalBudget) / Number(lotteryCount))
    : null

  const totalCost = suggestions
    ? suggestions.reduce((sum, p) => sum + (p.price ?? 0), 0)
    : null

  const totalBudgetNum = totalBudget !== '' ? Number(totalBudget) : null
  const overBudget = totalBudgetNum != null && totalCost != null && totalCost > totalBudgetNum

  const fetchSuggestions = async () => {
    setFetchingProducts(true)
    setSuggestions(null)
    try {
      const params = new URLSearchParams({
        prizeCount: String(prizeCount || 12),
        lotteryCount: String(lotteryCount || 1),
        redCount: String(counts.red),
        sparklingCount: String(counts.sparkling),
        whiteCount: String(counts.white),
        roseCount: String(counts.rose),
        beerCount: String(counts.beer),
        spiritsCount: String(counts.spirits),
      })
      if (budgetPerLottery != null) params.set('budgetPerLottery', String(budgetPerLottery))
      const r = await api.get<ShoppingSuggestions>(`/api/admin/shopping/suggestions?${params}`)
      setSuggestions(r.data.products)
    } catch (e: unknown) {
      setToast({ msg: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved henting av produkter', ok: false })
    } finally {
      setFetchingProducts(false)
    }
  }

  const openAllTabs = () => {
    suggestions?.forEach(p => window.open(p.url, '_blank', 'noopener,noreferrer'))
  }

  const addAllToInventory = async () => {
    if (!suggestions || suggestions.length === 0) return
    setAddingToInventory(true)
    try {
      await api.post('/api/admin/inventory/bulk', {
        items: suggestions.map(p => ({
          vinmonopoletCode: p.code,
          name: p.name,
          price: p.price ?? 0,
          category: p.category,
          quantity: 1,
          country: p.country
        }))
      })
      setToast({ msg: `${suggestions.length} produkter lagt til i lageret!`, ok: true })
    } catch (e: unknown) {
      setToast({ msg: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved lagring', ok: false })
    } finally {
      setAddingToInventory(false)
    }
  }

  const byCategory = suggestions
    ? [...CATEGORY_ORDER, ...suggestions.map(p => p.category).filter(c => !CATEGORY_ORDER.includes(c))]
        .reduce<Record<string, VinmonopoletProduct[]>>((acc, cat) => {
          const items = suggestions.filter(p => p.category === cat)
          if (items.length > 0) acc[cat] = items
          return acc
        }, {})
    : {}

  const countInput = (label: string, key: keyof Counts) => (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label style={{ fontSize: '0.8rem' }}>{label}</label>
      <input
        className="form-control"
        type="number"
        min={0}
        max={50}
        value={counts[key]}
        onChange={e => setCounts(c => ({ ...c, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
        style={{ width: 64 }}
      />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {toast && (
        <div style={{
          padding: '0.75rem 1.25rem', borderRadius: 8, fontWeight: 500, fontSize: '0.9rem',
          background: toast.ok ? '#166534' : '#7f1d1d',
          color: 'white', border: `1px solid ${toast.ok ? '#15803d' : '#991b1b'}`,
        }}>
          {toast.ok ? '✓' : '⚠️'} {toast.msg}
        </div>
      )}
      <div className="card">
        <div className="card-header">Fyll handekurv hos Vinmonopolet</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Totalbudsjett (kr)</label>
              <input
                className="form-control"
                type="number"
                min={0}
                value={totalBudget}
                onChange={e => setTotalBudget(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ width: 110 }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Antall trekniger</label>
              <input
                className="form-control"
                type="number"
                min={1}
                max={20}
                value={lotteryCount}
                onChange={e => setLotteryCount(e.target.value === '' ? '' : Number(e.target.value))}
                onBlur={e => { const n = parseInt(e.target.value); setLotteryCount(isNaN(n) ? 1 : Math.max(1, n)) }}
                style={{ width: 80 }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Premier per trekning</label>
              <input
                className="form-control"
                type="number"
                min={1}
                max={50}
                value={prizeCount}
                onChange={e => setPrizeCount(e.target.value === '' ? '' : Number(e.target.value))}
                onBlur={e => { const n = parseInt(e.target.value); setPrizeCount(isNaN(n) ? 12 : Math.max(1, n)) }}
                style={{ width: 90 }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end',
            padding: '0.75rem 1rem', background: 'var(--bg-subtle, rgba(255,255,255,0.04))',
            borderRadius: 8, border: '1px solid var(--border)', marginBottom: '1.25rem'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '0.25rem' }}>
              Antall per trekning:
            </span>
            {countInput('🍷 Rød', 'red')}
            {countInput('🥂 Muss.', 'sparkling')}
            {countInput('🫧 Hvit', 'white')}
            {countInput('🌸 Rosé', 'rose')}
            {countInput('🍺 Øl', 'beer')}
            {countInput('🥃 Sprit', 'spirits')}
            <button
              className="btn btn-sm"
              style={{ alignSelf: 'flex-end' }}
              onClick={() => setCounts(defaultCounts(Number(prizeCount) || 12))}
              title="Tilbakestill til standardfordeling"
            >
              ↺ Reset
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={fetchSuggestions} disabled={fetchingProducts}>
              {fetchingProducts ? '⏳ Henter produkter...' : '🔍 Finn produkter'}
            </button>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {budgetPerLottery != null && (
                <span>💰 <strong>{budgetPerLottery} kr</strong> per trekning</span>
              )}
              <span>Kun på lager i Horten Sjøsiden · fordeling varierer</span>
            </div>
          </div>
        </div>
      </div>

      {suggestions && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span>Foreslåtte produkter ({suggestions.length} flasker)</span>
              {totalCost != null && (
                <span style={{ fontWeight: 700, color: overBudget ? '#b91c1c' : 'var(--text)', fontSize: '0.9rem' }}>
                  {overBudget ? '⚠️' : '✓'} {totalCost.toFixed(0)} kr
                  {totalBudgetNum != null && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                      / {totalBudgetNum} kr budsjett
                    </span>
                  )}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
              {suggestions.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-sm" onClick={addAllToInventory} disabled={addingToInventory}
                    title="Legg alle foreslåtte produkter til lagerbeholdningen">
                    {addingToInventory ? '⏳' : '🗄️'} Legg til i lager
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={openAllTabs}>
                    🛒 Åpne alle i nye faner
                  </button>
                </div>
              )}
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Hvis kun én fane åpnes: tillat pop-ups for dette nettstedet i nettleseren
              </span>
            </div>
          </div>

          <div className="card-body" style={{ padding: '1rem' }}>
            {Object.entries(byCategory).map(([cat, products]) => (
              <div key={cat} style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {products.map(p => (
                    <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--wine)', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {p.name}
                      </a>
                      {p.price != null && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {p.price.toFixed(2)} kr
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
