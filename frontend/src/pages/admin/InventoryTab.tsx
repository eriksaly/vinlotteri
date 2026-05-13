import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../api/client'
import type { InventoryItem, VinmonopoletProduct } from '../../types'
import { useConfirm } from './shared'

export default function InventoryTab() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', price: '', category: '', quantity: '', country: '' })
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ vinmonopoletCode: '', name: '', price: '', category: '', quantity: '1', country: '' })
  const [saving, setSaving] = useState(false)
  const [quickCode, setQuickCode] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupPreview, setLookupPreview] = useState<VinmonopoletProduct | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const quickRef = useRef<HTMLInputElement>(null)
  const { confirm, dialog } = useConfirm()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const load = useCallback(async () => {
    try {
      const r = await api.get<InventoryItem[]>('/api/admin/inventory')
      setItems(r.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const doLookup = async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    setLookingUp(true)
    setLookupPreview(null)
    setLookupError(null)
    try {
      const r = await api.get<VinmonopoletProduct>(`/api/admin/inventory/lookup?code=${encodeURIComponent(trimmed)}`)
      setLookupPreview(r.data)
    } catch {
      setLookupError(`Fant ikke produkt med nummer "${trimmed}"`)
    } finally {
      setLookingUp(false)
    }
  }

  const confirmQuickAdd = async () => {
    if (!lookupPreview) return
    setSaving(true)
    try {
      await api.post('/api/admin/inventory', {
        vinmonopoletCode: lookupPreview.code,
        name: lookupPreview.name,
        price: lookupPreview.price ?? 0,
        category: lookupPreview.category,
        quantity: 1
      })
      setQuickCode('')
      setLookupPreview(null)
      await load()
      quickRef.current?.focus()
    } catch (e: unknown) {
      setToast({ msg: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved lagring', ok: false })
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id)
    setEditForm({ name: item.name, price: String(item.price), category: item.category, quantity: String(item.quantity), country: item.country })
  }

  const saveEdit = async (id: number) => {
    setSaving(true)
    try {
      await api.put(`/api/admin/inventory/${id}`, {
        name: editForm.name,
        price: parseFloat(editForm.price),
        category: editForm.category,
        quantity: parseInt(editForm.quantity),
        country: editForm.country
      })
      setEditingId(null)
      await load()
    } catch (e: unknown) {
      setToast({ msg: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved lagring', ok: false })
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (id: number) => {
    if (!await confirm('Fjerne fra lager?')) return
    try {
      await api.delete(`/api/admin/inventory/${id}`)
      setToast({ msg: 'Fjernet fra lager', ok: true })
      await load()
    } catch (e: unknown) {
      setToast({ msg: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved sletting', ok: false })
    }
  }

  const addItem = async () => {
    setSaving(true)
    try {
      await api.post('/api/admin/inventory', {
        vinmonopoletCode: addForm.vinmonopoletCode.trim(),
        name: addForm.name.trim(),
        price: parseFloat(addForm.price),
        category: addForm.category.trim(),
        quantity: parseInt(addForm.quantity),
        country: addForm.country.trim()
      })
      setAddForm({ vinmonopoletCode: '', name: '', price: '', category: '', quantity: '1', country: '' })
      setShowAddForm(false)
      await load()
    } catch (e: unknown) {
      setToast({ msg: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved opprettelse', ok: false })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card"><div className="card-body">Laster lager...</div></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {dialog}
      {toast && (
        <div style={{
          padding: '0.75rem 1.25rem', borderRadius: 8, fontWeight: 500, fontSize: '0.9rem',
          background: toast.ok ? '#166534' : '#7f1d1d',
          color: 'white', border: `1px solid ${toast.ok ? '#15803d' : '#991b1b'}`,
        }}>
          {toast.ok ? '✓' : '⚠️'} {toast.msg}
        </div>
      )}

      {/* Quick-add by Vinmonopolet number */}
      <div className="card">
        <div className="card-header">Hurtig-legg til fra Vinmonopolet</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              ref={quickRef}
              className="form-control"
              style={{ width: 160, fontFamily: 'monospace' }}
              placeholder="Varenr, f.eks. 9929801"
              value={quickCode}
              onChange={e => { setQuickCode(e.target.value); setLookupPreview(null); setLookupError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') doLookup(quickCode) }}
              disabled={lookingUp}
            />
            <button className="btn btn-primary btn-sm" onClick={() => doLookup(quickCode)} disabled={lookingUp || !quickCode.trim()}>
              {lookingUp ? '⏳' : '🔍'} Hent
            </button>
          </div>

          {lookupError && (
            <div style={{ marginTop: '0.75rem', color: 'var(--error)', fontSize: '0.9rem' }}>{lookupError}</div>
          )}

          {lookupPreview && (
            <div style={{
              marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem',
              background: 'var(--surface-raised)', borderRadius: 8, padding: '0.75rem 1rem',
              border: '1px solid var(--border)',
            }}>
              <img
                src={`https://bilder.vinmonopolet.no/cache/1200x1200-0/${lookupPreview.code}-1.jpg`}
                alt={lookupPreview.name}
                style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{lookupPreview.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {lookupPreview.category} · #{lookupPreview.code}
                  {lookupPreview.price != null && ` · ${lookupPreview.price.toFixed(2)} kr`}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={confirmQuickAdd} disabled={saving}>
                {saving ? '⏳' : '+ Legg til lager'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Lagerbeholdning ({items.length} produkter)</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(v => !v)}>
            {showAddForm ? '✕ Avbryt' : '+ Legg til'}
          </button>
        </div>

        {showAddForm && (
          <div className="card-body" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Varenr (Vinmonopolet)</label>
                <input className="form-control" style={{ width: 130 }} value={addForm.vinmonopoletCode}
                  onChange={e => setAddForm(f => ({ ...f, vinmonopoletCode: e.target.value }))} placeholder="9929801" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Navn</label>
                <input className="form-control" style={{ width: 220 }} value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Barolo DOCG 2019" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Kategori</label>
                <input className="form-control" style={{ width: 120 }} value={addForm.category}
                  onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} placeholder="Rødvin" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Pris (kr)</label>
                <input className="form-control" style={{ width: 80 }} type="number" min={0} value={addForm.price}
                  onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Land</label>
                <input className="form-control" style={{ width: 100 }} value={addForm.country}
                  onChange={e => setAddForm(f => ({ ...f, country: e.target.value }))} placeholder="Belgia" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Antall</label>
                <input className="form-control" style={{ width: 65 }} type="number" min={1} value={addForm.quantity}
                  onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={addItem} disabled={saving || !addForm.vinmonopoletCode || !addForm.name}>
                Lagre
              </button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Lageret er tomt. Legg til flasker manuelt eller importer fra Fyll kjelleren-fanen.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}></th>
                  <th>Navn</th>
                  <th>Kategori</th>
                  <th>Land</th>
                  <th style={{ textAlign: 'right' }}>Pris</th>
                  <th style={{ textAlign: 'center' }}>Antall</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </td>
                    {editingId === item.id ? (
                      <>
                        <td>
                          <input className="form-control" style={{ width: '100%', minWidth: 160 }}
                            value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                        </td>
                        <td>
                          <input className="form-control" style={{ width: 120 }}
                            value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} />
                        </td>
                        <td>
                          <input className="form-control" style={{ width: 90 }}
                            value={editForm.country} onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))} placeholder="Land" />
                        </td>
                        <td>
                          <input className="form-control" style={{ width: 80, textAlign: 'right' }} type="number"
                            value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} />
                        </td>
                        <td>
                          <input className="form-control" style={{ width: 65, textAlign: 'center', margin: '0 auto' }} type="number" min={0}
                            value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(item.id)} disabled={saving}>Lagre</button>
                            <button className="btn btn-sm" onClick={() => setEditingId(null)}>✕</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <div style={{ fontWeight: 500 }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{item.vinmonopoletCode}</div>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{item.category}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{item.country || '—'}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{item.price.toFixed(2)} kr</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm" onClick={() => startEdit(item)}>✏️</button>
                            <button className="btn btn-sm" style={{ color: 'var(--error)' }} onClick={() => deleteItem(item.id)}>🗑️</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
