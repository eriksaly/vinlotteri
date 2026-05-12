import { useState, useEffect, useCallback } from 'react'
import api from '../../api/client'
import type { Buyer, LotteryInfo, Participant } from '../../types'
import { useConfirm, ParticipantAvatar, ParticipantAutocomplete } from './shared'

export default function BuyersTab({ lottery, onLotteryChange }: { lottery: LotteryInfo | null; onLotteryChange: () => Promise<void> }) {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | ''>('')
  const [selectedParticipantLabel, setSelectedParticipantLabel] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const { confirm, dialog } = useConfirm()

  const load = useCallback(async () => {
    const [b, p] = await Promise.all([
      api.get<Buyer[]>('/api/admin/buyers'),
      api.get<Participant[]>('/api/admin/participants'),
    ])
    setBuyers(b.data)
    setParticipants(p.data)
  }, [])

  useEffect(() => { load() }, [load])

  const startEdit = (b: Buyer) => {
    setEditingId(b.participant.id)
    setEditAmount(String(b.ticketCount * (lottery?.pricePerTicket ?? 5)))
  }

  const cancelEdit = () => { setEditingId(null); setEditAmount('') }

  const saveEdit = async (participantId: number) => {
    const kr = parseInt(editAmount) || 0
    const price = lottery?.pricePerTicket ?? 5
    const newQuantity = Math.max(1, Math.floor(kr / price))
    try {
      const r = await api.put<Buyer[]>(`/api/admin/buyers/${participantId}`, { quantity: newQuantity })
      setBuyers(r.data)
      await onLotteryChange()
      setEditingId(null)
      setEditAmount('')
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil')
    }
  }

  const addBuyer = async () => {
    if (!selectedParticipantId) return
    setError('')
    try {
      const r = await api.post<Buyer[]>('/api/admin/buyers', { participantId: selectedParticipantId, quantity })
      setBuyers(r.data)
      await onLotteryChange()
      setSelectedParticipantId('')
      setSelectedParticipantLabel('')
      setQuantity(1)
      setAmount('')
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil')
    }
  }

  const removeBuyer = async (participantId: number) => {
    if (!await confirm('Fjern alle lodd for denne deltakeren?')) return
    try {
      const r = await api.delete<Buyer[]>(`/api/admin/buyers/${participantId}`)
      setBuyers(r.data)
      await onLotteryChange()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil')
    }
  }

  const totalTickets = buyers.reduce((s, b) => s + b.ticketCount, 0)
  const isOpen = lottery?.status === 'OPEN'
  const buyersWithParticipants = participants.filter(p => !buyers.find(b => b.participant.id === p.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {isOpen && (
        <div className="card" style={{ overflow: 'visible' }}>
          <div className="card-header">Legg til loddkjøp</div>
          <div className="card-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                <label>Deltaker</label>
                <ParticipantAutocomplete
                  participants={participants}
                  value={selectedParticipantLabel}
                  onChange={(id, label) => { setSelectedParticipantId(id); setSelectedParticipantLabel(label) }}
                />
              </div>
              <div className="form-group" style={{ flex: '0 0 110px', marginBottom: 0 }}>
                <label>Vipps-beløp (kr)</label>
                <input
                  className="form-control"
                  type="number"
                  min={lottery?.pricePerTicket ?? 5}
                  step={lottery?.pricePerTicket ?? 5}
                  placeholder="eks. 40"
                  value={amount}
                  onChange={e => {
                    setAmount(e.target.value)
                    const kr = parseInt(e.target.value) || 0
                    const price = lottery?.pricePerTicket ?? 5
                    setQuantity(Math.max(1, Math.floor(kr / price)))
                  }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>&nbsp;</label>
                <button className="btn btn-primary" onClick={addBuyer} disabled={!selectedParticipantId}>
                  Legg til {quantity} lodd
                </button>
              </div>
            </div>
            {buyersWithParticipants.length === 0 && participants.length > 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                💡 Alle registrerte deltakere har allerede kjøpt lodd. Velg en eksisterende for å legge til flere.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Kjøpere i dette lotteriet</span>
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>
            {totalTickets} lodd · {(totalTickets * (lottery?.pricePerTicket ?? 5))} kr
          </span>
        </div>
        {buyers.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            Ingen lodd solgt ennå.
          </div>
        ) : (
          <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
            {[...buyers].sort((a, b) => a.participant.tag.localeCompare(b.participant.tag)).map(b => (
              <div key={b.participant.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.8rem', borderRadius: 8,
                background: 'var(--bg)', border: editingId === b.participant.id ? '1.5px solid var(--wine)' : '1.5px solid var(--border)',
              }}>
                <ParticipantAvatar participant={b.participant} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.participant.name}
                  </div>
                  {editingId === b.participant.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                      <input
                        className="form-control"
                        type="number"
                        min={lottery?.pricePerTicket ?? 5}
                        step={lottery?.pricePerTicket ?? 5}
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(b.participant.id); if (e.key === 'Escape') cancelEdit() }}
                        autoFocus
                        onFocus={e => e.target.select()}
                        style={{ width: 70, padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        kr = {Math.max(1, Math.floor((parseInt(editAmount) || 0) / (lottery?.pricePerTicket ?? 5)))} lodd
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {b.ticketCount} lodd · {b.ticketCount * (lottery?.pricePerTicket ?? 5)} kr
                    </div>
                  )}
                  {editingId === b.participant.id ? (
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                      <button className="btn btn-primary btn-sm" style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }} onClick={() => saveEdit(b.participant.id)}>Lagre</button>
                      <button className="btn btn-outline btn-sm" style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }} onClick={cancelEdit}>Avbryt</button>
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.3rem', height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${b.ticketPercentage}%`, height: '100%', background: 'var(--wine)', borderRadius: 2 }} />
                    </div>
                  )}
                </div>
                {isOpen && editingId !== b.participant.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(b)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.2rem', lineHeight: 1 }}
                      title="Rediger"
                    >✏️</button>
                    <button
                      onClick={() => removeBuyer(b.participant.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', padding: '0.2rem', lineHeight: 1 }}
                      title="Fjern"
                    >✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {dialog}
    </div>
  )
}
