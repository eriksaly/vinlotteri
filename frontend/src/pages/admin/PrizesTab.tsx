import { useState, useEffect, useCallback } from 'react'
import api from '../../api/client'
import type { LotteryInfo, LotteryPrize, InventoryItem } from '../../types'


export default function PrizesTab({ lottery }: { lottery: LotteryInfo | null }) {
  const [prizes, setPrizes] = useState<LotteryPrize[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [slotCount, setSlotCount] = useState<number | ''>(lottery?.wineCount ?? 12)
  const [saving, setSaving] = useState(false)
  const [assigningPos, setAssigningPos] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const load = useCallback(async () => {
    const [p, inv] = await Promise.all([
      api.get<LotteryPrize[]>('/api/admin/lottery/current/prizes'),
      api.get<InventoryItem[]>('/api/admin/inventory'),
    ])
    setPrizes(p.data)
    setInventory(inv.data)
    if (p.data.length > 0) setSlotCount(p.data.length)
  }, [])

  useEffect(() => { load() }, [load])

  const applySlots = async () => {
    if (!slotCount) return
    setSaving(true)
    try {
      const r = await api.post<LotteryPrize[]>('/api/admin/lottery/current/prizes', { count: slotCount })
      setPrizes(r.data)
    } catch (e: unknown) {
      setToast({ msg: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil', ok: false })
    } finally {
      setSaving(false)
    }
  }

  const assignItems = async (position: number, ids: number[]) => {
    setAssigningPos(position)
    try {
      const r = await api.put<LotteryPrize>(`/api/admin/lottery/current/prizes/${position}`, { inventoryItemIds: ids })
      setPrizes(prev => prev.map(p => p.position === position ? r.data : p))
    } catch (e: unknown) {
      setToast({ msg: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil', ok: false })
    } finally {
      setAssigningPos(null)
    }
  }

  const autoFill = async () => {
    if (prizes.length === 0) return

    const undrawnPrizes = prizes.filter(p => p.winnerId == null)
    if (undrawnPrizes.length === 0) return

    const spiritCats = new Set(['gin', 'whisky', 'akevitt', 'brennevin', 'druebrennevin', 'likør'])

    // Beer: group by country/region — 3 bottles from the same country = 1 prize
    const sortedBeers = [...inventory]
      .filter(i => i.category.toLowerCase() === 'øl')
      .sort((a, b) => a.price - b.price)
    // Beer is always exactly 1 prize slot — pick the first complete group of 3 from same country.
    // Countries with <3 beers fall back to a mixed group.
    const beerByCountry = new Map<string, InventoryItem[]>()
    for (const beer of sortedBeers) {
      const key = beer.country.trim() || 'Ukjent'
      if (!beerByCountry.has(key)) beerByCountry.set(key, [])
      beerByCountry.get(key)!.push(beer)
    }
    const firstCompleteCountry = [...beerByCountry.values()].find(g => g.length >= 3)
    const beerGroup = firstCompleteCountry
      ? firstCompleteCountry.slice(0, 3)
      : sortedBeers.slice(0, 3)
    const beerGroups: InventoryItem[][] = beerGroup.length > 0 ? [beerGroup] : []

    // Reserve a random spirit for the last slot
    const allSpirits = inventory.filter(i => spiritCats.has(i.category.toLowerCase()))
    const reservedSpirit = allSpirits.length > 0
      ? allSpirits[Math.floor(Math.random() * allSpirits.length)]
      : null

    // Everything else: non-beer, not the reserved spirit — cap hvitvin/rosévin/musserende at 1 each, shuffle the rest
    const cappedCats = new Set(['hvitvin', 'rosévin', 'musserende vin'])
    const cappedSeen = new Set<string>()
    const sortedOthers = [...inventory]
      .filter(i => i.category.toLowerCase() !== 'øl' && i.id !== reservedSpirit?.id)
      .sort(() => Math.random() - 0.5)
      .filter(i => {
        const cat = i.category.toLowerCase()
        if (!cappedCats.has(cat)) return true
        if (cappedSeen.has(cat)) return false
        cappedSeen.add(cat)
        return true
      })

    // Main fill order: beer groups then singles
    const mainAssignments: number[][] = [
      ...beerGroups.map(g => g.map(i => i.id)),
      ...sortedOthers.map(i => [i.id]),
    ]

    setSaving(true)
    try {
      const lastPrize = undrawnPrizes[undrawnPrizes.length - 1]
      let mainIdx = 0
      for (const prize of undrawnPrizes) {
        const isLast = reservedSpirit != null && prize.position === lastPrize.position
        const ids = isLast ? [reservedSpirit!.id] : (mainAssignments[mainIdx++] ?? [])
        await api.put<LotteryPrize>(`/api/admin/lottery/current/prizes/${prize.position}`, { inventoryItemIds: ids })
      }
      const r = await api.get<LotteryPrize[]>('/api/admin/lottery/current/prizes')
      setPrizes(r.data)
    } catch (e: unknown) {
      setToast({ msg: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved auto-fyll', ok: false })
    } finally {
      setSaving(false)
    }
  }

  const clearAll = async () => {
    setSaving(true)
    try {
      const undrawn = prizes.filter(p => p.winnerId == null)
      await Promise.all(undrawn.map(p =>
        api.put(`/api/admin/lottery/current/prizes/${p.position}`, { inventoryItemIds: [] })
      ))
      const r = await api.get<LotteryPrize[]>('/api/admin/lottery/current/prizes')
      setPrizes(r.data)
      setToast({ msg: 'Alle tildelinger nullstilt', ok: true })
    } catch (e: unknown) {
      setToast({ msg: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved nullstilling', ok: false })
    } finally {
      setSaving(false)
    }
  }

  if (!lottery) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Ingen aktiv lotteri. Opprett et lotteri fra fanen «Loddkjøpere».
        </div>
      </div>
    )
  }

  const unassignedCount = prizes.filter(p => p.items.length === 0).length
  const assignedCount = prizes.filter(p => p.items.length > 0).length
  const assignedItemIds = new Set(prizes.flatMap(p => p.items.map(i => i.id)))

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
      {/* Slot count configurator */}
      <div className="card">
        <div className="card-header">Antall premier</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Premier i trekningen</label>
              <input
                className="form-control"
                type="number"
                min={1}
                max={100}
                style={{ width: 80 }}
                value={slotCount}
                onChange={e => setSlotCount(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <button className="btn btn-primary" onClick={applySlots} disabled={saving || !slotCount}>
              {saving ? '⏳' : '✓'} Sett antall
            </button>
            {prizes.length > 0 && inventory.length > 0 && (
              <button className="btn" onClick={autoFill} disabled={saving}
                title="Fordel lagerflasker automatisk etter kategori-rekkefølge: øl → hvitvin/rosé → rødvin/musserende → brennevin">
                🪄 Auto-fyll
              </button>
            )}
            {prizes.some(p => p.items.length > 0 && p.winnerId == null) && (
              <button className="btn" onClick={clearAll} disabled={saving}
                style={{ color: 'var(--text-muted)' }}>
                🗑️ Nullstill
              </button>
            )}
            {prizes.length > 0 && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                {assignedCount}/{prizes.length} tildelt
              </span>
            )}
          </div>
          {prizes.length > 0 && unassignedCount > 0 && (
            <p style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Auto-fyll fordeler: øl → hvitvin/rosé → rødvin (med musserende innimellom) → brennevin/likør. Billigste først innen hver kategori.
            </p>
          )}
        </div>
      </div>

      {/* Prize list */}
      {prizes.length > 0 && (
        <div className="card">
          <div className="card-header">Premiebord — posisjon og flasker</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {prizes.map(prize => {
              const totalPrice = prize.items.reduce((s, i) => s + i.price, 0)
              const busy = assigningPos === prize.position
              return (
                <div key={prize.position} style={{
                  display: 'flex', gap: '1rem', alignItems: 'flex-start',
                  padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
                  opacity: prize.winnerId != null ? 0.6 : 1,
                }}>
                  {/* Position */}
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', minWidth: 28, paddingTop: 4, textAlign: 'center' }}>
                    {prize.position}
                  </div>

                  {/* Bottle images */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {prize.items.length > 0 ? prize.items.map(item => (
                      <img key={item.id} src={item.imageUrl} alt={item.name}
                        style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    )) : (
                      <div style={{ width: 40, height: 40, background: 'var(--surface-raised)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>?</div>
                    )}
                  </div>

                  {/* Names + status */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {prize.items.length > 0 ? prize.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 2 }}>
                        <span style={{ fontWeight: 500, fontSize: '0.88rem' }}>{item.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.price.toFixed(0)} kr</span>
                        {prize.winnerId == null && (
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0 2px' }}
                            disabled={busy}
                            onClick={() => assignItems(prize.position, prize.items.filter(i => i.id !== item.id).map(i => i.id))}>
                            ✕
                          </button>
                        )}
                      </div>
                    )) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.88rem' }}>Ikke tildelt</span>
                    )}
                    {prize.items.length > 1 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Totalt {totalPrice.toFixed(0)} kr
                      </div>
                    )}
                  </div>

                  {/* Status + add dropdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                    {prize.winnerId != null ? (
                      <span className="badge badge-gold">Trukket</span>
                    ) : prize.items.length > 0 ? (
                      <span className="badge badge-green">Klar</span>
                    ) : (
                      <span className="badge">Mangler flaske</span>
                    )}
                    {prize.winnerId == null && (
                      <select className="form-control" style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem', width: 200 }}
                        value="" disabled={busy}
                        onChange={e => {
                          if (!e.target.value) return
                          const newId = Number(e.target.value)
                          assignItems(prize.position, [...prize.items.map(i => i.id), newId])
                          e.target.value = ''
                        }}>
                        <option value="">+ Legg til flaske</option>
                        {inventory
                          .filter(inv => !assignedItemIds.has(inv.id) || prize.items.some(i => i.id === inv.id))
                          .map(inv => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} ({inv.category}, {inv.price.toFixed(0)} kr)
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {prizes.length === 0 && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Ingen premieplasser konfigurert. Sett antall premier over for å starte.
          </div>
        </div>
      )}
    </div>
  )
}
