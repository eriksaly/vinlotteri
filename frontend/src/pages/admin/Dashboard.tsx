import { useEffect, useState, useRef, useCallback, ReactNode, forwardRef, useImperativeHandle } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
import api from '../../api/client'
import type { Buyer, LotteryInfo, Participant, Winner, DrawResult } from '../../types'

// ─── Modal ───────────────────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="modal">
        <div className="modal-header">{title}</div>
        {children}
      </div>
    </div>
  )
}

function useConfirm() {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null)
  const confirm = (message: string) => new Promise<boolean>(resolve => setState({ message, resolve }))
  const handleClose = (value: boolean) => { state?.resolve(value); setState(null) }
  const dialog = state ? (
    <Modal title="Er du sikker?" onClose={() => handleClose(false)}>
      <div className="modal-body" style={{ color: 'var(--text-muted)' }}>{state.message}</div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={() => handleClose(false)}>Avbryt</button>
        <button className="btn btn-danger" onClick={() => handleClose(true)}>Ja, fortsett</button>
      </div>
    </Modal>
  ) : null
  return { confirm, dialog }
}

type Tab = 'buyers' | 'drawing' | 'participants'

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('buyers')
  const [lottery, setLottery] = useState<LotteryInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadLottery = useCallback(() => {
    return api.get<LotteryInfo>('/api/admin/lottery/current')
      .then(r => {
        setLottery(r.data)
        if (r.data.status === 'DRAWING') setTab('drawing')
      })
      .catch(err => {
        if (err.response?.status === 401) navigate('/admin/login')
        else if (err.response?.status === 204) setLottery(null)
      })
  }, [navigate])

  useEffect(() => {
    api.get('/api/admin/me').catch(() => navigate('/admin/login'))
    loadLottery().finally(() => setLoading(false))
  }, [navigate, loadLottery])

  const logout = async () => {
    await api.post('/api/admin/logout')
    navigate('/admin/login')
  }

  const createLottery = async () => {
    try {
      const r = await api.post<LotteryInfo>('/api/admin/lottery')
      setLottery(r.data)
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved opprettelse')
    }
  }

  return (
    <div className="page">
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-brand">🍷 Vinsjefen</span>
          <div className="nav-links">
            <Link to="/" className="nav-link">Forside</Link>
            <Link to="/statistikk" className="nav-link">Hall of Vino</Link>
            <button onClick={logout} className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}>🚪 Lås kjelleren</button>
          </div>
        </div>
      </nav>

      <div style={{ background: 'var(--wine-dark)', color: 'white', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {loading ? <span>Laster...</span> : lottery ? (
            <>
              <span style={{ fontWeight: 700 }}>{lottery.name}</span>
              <StatusBadge status={lottery.status} />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                {lottery.totalTickets} lodd solgt
              </span>
            </>
          ) : (
            <>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>😴 Kjelleren støver ned... ingen aktiv lotteri</span>
              <button className="btn btn-gold btn-sm" onClick={createLottery}>🍾 Støv av kjelleren!</button>
            </>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          {lottery?.status === 'DRAWING' ? (
            <DrawingTab lottery={lottery} onLotteryChange={loadLottery} />
          ) : (
            <>
              <div className="tabs">
                <div className={`tab ${tab === 'buyers' ? 'active' : ''}`} onClick={() => setTab('buyers')}>🎟️ Loddkjøpere</div>
                <div className={`tab ${tab === 'drawing' ? 'active' : ''}`} onClick={() => setTab('drawing')}>🎰 Trekningstid!</div>
                <div className={`tab ${tab === 'participants' ? 'active' : ''}`} onClick={() => setTab('participants')}>👥 Vinfolket</div>
              </div>
              {tab === 'buyers' && <BuyersTab lottery={lottery} onLotteryChange={loadLottery} />}
              {tab === 'drawing' && <DrawingTab lottery={lottery} onLotteryChange={loadLottery} />}
              {tab === 'participants' && <ParticipantsTab />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Buyers Tab ─────────────────────────────────────────────────────────────

function BuyersTab({ lottery, onLotteryChange }: { lottery: LotteryInfo | null; onLotteryChange: () => Promise<void> }) {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | ''>('')
  const [selectedParticipantLabel, setSelectedParticipantLabel] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
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
                background: 'var(--bg)', border: '1.5px solid var(--border)',
              }}>
                <ParticipantAvatar participant={b.participant} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.participant.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {b.ticketCount} lodd · {b.ticketCount * (lottery?.pricePerTicket ?? 5)} kr
                  </div>
                  <div style={{ marginTop: '0.3rem', height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${b.ticketPercentage}%`, height: '100%', background: 'var(--wine)', borderRadius: 2 }} />
                  </div>
                </div>
                {isOpen && (
                  <button
                    onClick={() => removeBuyer(b.participant.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', padding: '0.2rem', lineHeight: 1, flexShrink: 0 }}
                    title="Fjern"
                  >✕</button>
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

// ─── Drawing Tab ─────────────────────────────────────────────────────────────

function DrawingTab({ lottery, onLotteryChange }: { lottery: LotteryInfo | null; onLotteryChange: () => Promise<void> }) {
  const [winners, setWinners] = useState<Winner[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [animating, setAnimating] = useState(false)
  const [latestWinner, setLatestWinner] = useState<Winner | null>(null)
  const [, setRemainingTickets] = useState<number>(0)
  const [wineCount, setWineCount] = useState(5)
  const [showStartForm, setShowStartForm] = useState(false)
  const { confirm, dialog } = useConfirm()
  const wheelRef = useRef<WheelHandle>(null)

  const load = useCallback(async () => {
    const [w, b] = await Promise.all([
      api.get<Winner[]>('/api/admin/winners'),
      api.get<Buyer[]>('/api/admin/buyers'),
    ])
    setWinners(w.data)
    setBuyers(b.data)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (lottery) {
      const totalTickets = buyers.reduce((s, b) => s + b.ticketCount, 0)
      setRemainingTickets(totalTickets - winners.length)
    }
  }, [lottery, buyers, winners])

  const startDrawing = async () => {
    try {
      await api.post('/api/admin/lottery/start-drawing', { wineCount })
      setShowStartForm(false)
      await onLotteryChange()
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil')
    }
  }

  const drawWinner = async () => {
    if (animating) return
    setAnimating(true)
    setLatestWinner(null)

    let resolveId!: (id: number) => void
    let rejectId!: (e: unknown) => void
    const winnerIdPromise = new Promise<number>((res, rej) => { resolveId = res; rejectId = rej })
    const spinPromise = wheelRef.current?.spin(winnerIdPromise) ?? Promise.resolve()

    try {
      const result = await api.post<DrawResult>('/api/admin/lottery/draw')
      resolveId(result.data.winner.participantId)
      await spinPromise
      setLatestWinner(result.data.winner)
      setRemainingTickets(result.data.remainingTickets)
      setWinners(prev => [...prev, result.data.winner])
      const b = await api.get<Buyer[]>('/api/admin/buyers')
      setBuyers(b.data)
      setAnimating(false)
      fireConfetti()
    } catch (e: unknown) {
      rejectId(e)
      setAnimating(false)
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved trekning')
    }
  }

  const finishLottery = async () => {
    if (!await confirm('Avslutte lotteriet? Statistikken blir offentlig tilgjengelig.')) return
    try {
      await api.post('/api/admin/lottery/finish')
      await onLotteryChange()
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil')
    }
  }

  const isOpen = lottery?.status === 'OPEN'
  const isDrawing = lottery?.status === 'DRAWING'
  const totalTickets = buyers.reduce((s, b) => s + b.ticketCount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {isOpen && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Det er solgt <strong>{totalTickets} lodd</strong>. Når du starter trekning, stenges loddsalget.
            </p>
            {!showStartForm ? (
              <button className="btn btn-primary btn-xl" onClick={() => setShowStartForm(true)} disabled={totalTickets === 0}>
                🎬 Start trekning
              </button>
            ) : (
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '1.5rem 2rem', border: '2px solid var(--wine)' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>🍾 Hvor mange viner er i kjelleren?</div>
                <div className="qty-control" style={{ gap: '1rem' }}>
                  <button className="qty-btn" style={{ width: 40, height: 40, fontSize: '1.3rem' }} onClick={() => setWineCount(q => Math.max(1, q - 1))}>−</button>
                  <span style={{ fontWeight: 800, fontSize: '2rem', minWidth: '2.5rem', textAlign: 'center', color: 'var(--wine)' }}>{wineCount}</span>
                  <button className="qty-btn" style={{ width: 40, height: 40, fontSize: '1.3rem' }} onClick={() => setWineCount(q => Math.min(50, q + 1))}>+</button>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-outline" onClick={() => setShowStartForm(false)}>Avbryt</button>
                  <button className="btn btn-primary btn-lg" onClick={startDrawing}>La oss finne vinerne!</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isDrawing && (
        <>
          {/* Spinning wheel stage */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--wine-dark) 0%, var(--wine) 100%)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.2rem',
            }}>
              <SpinningWheel ref={wheelRef} buyers={buyers} />

              {latestWinner && !animating && (
                <div style={{ color: 'white', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>🏆 {latestWinner.participantTag}</div>
                  <div style={{ color: '#c5c5c5', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                    {latestWinner.participantName}
                  </div>
                  <div style={{ color: '#e8c84a', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    🎟️ Lodd #{latestWinner.ticketNumber} · Gevinst #{latestWinner.position}
                  </div>
                </div>
              )}

              {isDrawing && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    className="btn btn-gold btn-xl"
                    onClick={drawWinner}
                    disabled={animating || winners.length >= (lottery?.wineCount ?? 999)}
                  >
                    {animating ? '🎰 Skjebnen avgjøres...' : winners.length >= (lottery?.wineCount ?? 999) ? '🏁 Kjelleren er tom!' : '🎰 Trekk vin'}
                  </button>
                  {lottery?.wineCount != null && winners.length < lottery.wineCount && !animating && (
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>
                      {winesLeftMessage(lottery.wineCount - winners.length)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Winners list */}
          {winners.length > 0 && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🏆 Vinnere ({winners.length}{lottery?.wineCount ? `/${lottery.wineCount}` : ''})</span>
                {isDrawing && lottery?.wineCount != null && winners.length >= lottery.wineCount && (
                  <button className="btn btn-primary btn-sm" onClick={finishLottery}>🎉 Avslutt lotteri</button>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Vinner</th><th>Tag</th><th>Lodd-nr</th></tr>
                  </thead>
                  <tbody>
                    {[...winners].reverse().map(w => (
                      <tr key={w.position}>
                        <td><span className="badge badge-gold">#{w.position}</span></td>
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ParticipantAvatarById participantId={w.participantId} buyers={buyers} />
                            {w.participantName}
                          </div>
                        </td>
                        <td><span className="badge badge-wine">{w.participantTag}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{w.ticketNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isDrawing && winners.length > 0 && (lottery?.wineCount == null || winners.length < lottery.wineCount) && (
            <div style={{ textAlign: 'right' }}>
              <button className="btn btn-outline btn-sm" onClick={finishLottery} style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                Avslutt lotteri tidlig
              </button>
            </div>
          )}
        </>
      )}

      {!lottery && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            Opprett et lotteri fra topplinja for å komme i gang.
          </div>
        </div>
      )}
      {dialog}
    </div>
  )
}

function winesLeftMessage(n: number): string {
  if (n === 1) return '🚨 Siste flaske i kjelleren!'
  if (n === 2) return '😬 Kun 2 flasker igjen uten eier...'
  if (n === 3) return '🍾 3 flasker venter spent på skjebnen'
  if (n <= 5) return `🍷 ${n} flasker holder pusten`
  return `🍾 ${n} flasker lurer på hvem som er heldig`
}

// ─── Participants Tab ─────────────────────────────────────────────────────────

function ParticipantsTab() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [error, setError] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editTag, setEditTag] = useState('')
  const [uploadingId, setUploadingId] = useState<number | null>(null)

  const load = useCallback(() => api.get<Participant[]>('/api/admin/participants').then(r => setParticipants(r.data)), [])
  useEffect(() => { load() }, [load])

  const create = async () => {
    setError('')
    try {
      await api.post('/api/admin/participants', { name: name.trim(), tag: tag.trim() })
      setName(''); setTag('')
      await load()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil')
    }
  }

  const startEdit = (p: Participant) => {
    setEditId(p.id); setEditName(p.name); setEditTag(p.tag)
  }

  const saveEdit = async () => {
    if (!editId) return
    try {
      await api.put(`/api/admin/participants/${editId}`, { name: editName.trim(), tag: editTag.trim() })
      setEditId(null)
      await load()
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil')
    }
  }

  const uploadPhoto = async (participantId: number, file: File) => {
    setUploadingId(participantId)
    const form = new FormData()
    form.append('file', file)
    try {
      await api.post(`/api/admin/participants/${participantId}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await load()
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved opplasting')
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <div className="card-header">Ny deltaker</div>
        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label>Fullt navn</label>
              <input className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="Ola Nordmann" />
            </div>
            <div className="form-group" style={{ flex: '0 0 120px', marginBottom: 0 }}>
              <label>Tag (forkortelse)</label>
              <input className="form-control" value={tag} onChange={e => setTag(e.target.value.toUpperCase())} placeholder="ON" maxLength={3} />
            </div>
            <button className="btn btn-primary" onClick={create} disabled={!name.trim() || !tag.trim()}>
              Opprett
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Alle deltakere ({participants.length})</div>
        {participants.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            Ingen deltakere ennå. Opprett din første!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>Bilde</th><th>Navn</th><th>Tag</th><th>Handlinger</th></tr>
              </thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id}>
                    <td>
                      <ParticipantAvatar participant={p} />
                    </td>
                    <td>
                      {editId === p.id ? (
                        <input className="form-control" value={editName} onChange={e => setEditName(e.target.value)} style={{ maxWidth: 200 }} />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                      )}
                    </td>
                    <td>
                      {editId === p.id ? (
                        <input className="form-control" value={editTag} onChange={e => setEditTag(e.target.value.toUpperCase())} style={{ maxWidth: 70 }} maxLength={3} />
                      ) : (
                        <span className="badge badge-wine">{p.tag}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {editId === p.id ? (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={saveEdit}>Lagre</button>
                            <button className="btn btn-outline btn-sm" onClick={() => setEditId(null)}>Avbryt</button>
                          </>
                        ) : (
                          <button className="btn btn-outline btn-sm" onClick={() => startEdit(p)}>Rediger</button>
                        )}
                        <PhotoUploadButton
                          participantId={p.id}
                          hasPhoto={p.hasPhoto}
                          uploading={uploadingId === p.id}
                          onUpload={uploadPhoto}
                        />
                      </div>
                    </td>
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

// ─── Photo upload button (own input per instance) ────────────────────────────

function PhotoUploadButton({ participantId, hasPhoto, uploading, onUpload }: {
  participantId: number
  hasPhoto: boolean
  uploading: boolean
  onUpload: (id: number, file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onUpload(participantId, f)
          e.target.value = ''
        }}
      />
      <button
        className="btn btn-outline btn-sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? '⏳' : hasPhoto ? '📷 Bytt bilde' : '📷 Last opp'}
      </button>
    </>
  )
}

// ─── Spinning Wheel ───────────────────────────────────────────────────────────

const WHEEL_COLORS = [
  '#722F37', '#2d4a7a', '#2d7a5a', '#7a4a2d',
  '#5a2d7a', '#c5a028', '#7a2d6a', '#2d637a',
  '#7a2d4a', '#3a7a2d', '#6a2d7a', '#2d7a6a',
]

function getWheelSegments(buyerList: Buyer[]) {
  const total = buyerList.reduce((s, b) => s + b.ticketCount, 0)
  if (total === 0) return []
  let acc = 0
  return buyerList.map((b, i) => {
    const sweep = (b.ticketCount / total) * 2 * Math.PI
    const start = acc; acc += sweep
    return { buyer: b, start, end: acc, mid: start + sweep / 2, color: WHEEL_COLORS[i % WHEEL_COLORS.length] }
  })
}

function drawWheelFrame(canvas: HTMLCanvasElement | null, angle: number, buyerList: Buyer[]) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  const cx = W / 2, cy = H / 2
  const r = Math.min(cx, cy) - 36
  ctx.clearRect(0, 0, W, H)
  const segs = getWheelSegments(buyerList)
  if (segs.length === 0) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill(); return
  }
  for (const seg of segs) {
    ctx.beginPath(); ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, seg.start + angle, seg.end + angle)
    ctx.closePath(); ctx.fillStyle = seg.color; ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke()
    const sweep = seg.end - seg.start
    if (sweep > 0.12) {
      const ma = seg.mid + angle
      const fontSize = Math.max(10, Math.min(15, sweep * 14))
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(ma)
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.fillStyle = 'white'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 3
      ctx.fillText(seg.buyer.participant.tag, r * 0.9, 0)
      ctx.restore()
    }
  }
  // Center circle
  ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 2 * Math.PI)
  ctx.fillStyle = 'white'; ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke()
  // Pointer triangle at top pointing down into wheel
  ctx.beginPath()
  ctx.moveTo(cx, cy - r + 2)
  ctx.lineTo(cx - 13, cy - r - 22); ctx.lineTo(cx + 13, cy - r - 22)
  ctx.closePath(); ctx.fillStyle = '#C5A028'; ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke()
}

interface WheelHandle {
  spin: (winnerIdPromise: Promise<number>) => Promise<void>
}

const SpinningWheel = forwardRef<WheelHandle, { buyers: Buyer[] }>(({ buyers }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const angleRef = useRef(Math.random() * Math.PI * 2)
  const spinningRef = useRef(false)

  useEffect(() => {
    if (!spinningRef.current) drawWheelFrame(canvasRef.current, angleRef.current, buyers)
  }, [buyers])

  useImperativeHandle(ref, () => ({
    spin(winnerIdPromise: Promise<number>): Promise<void> {
      return new Promise(resolve => {
        if (spinningRef.current) { resolve(); return }
        spinningRef.current = true
        cancelAnimationFrame(rafRef.current)
        const snap = buyers.slice()
        const startAngle = angleRef.current
        const t0 = performance.now()
        const FAST = 0.006 // rad/ms ≈ 3.4 rotations/sec
        let phase: 'fast' | 'decel' = 'fast'
        let decelFrom = 0, decelTarget = 0, decelT0 = 0
        const DECEL_MS = 8000
        const loop = () => {
          const now = performance.now()
          let a: number
          if (phase === 'fast') {
            a = startAngle + FAST * (now - t0)
          } else {
            const p = Math.min(1, (now - decelT0) / DECEL_MS)
            a = decelFrom + (decelTarget - decelFrom) * (1 - Math.pow(1 - p, 3))
            if (p >= 1) {
              angleRef.current = decelTarget
              spinningRef.current = false
              drawWheelFrame(canvasRef.current, decelTarget, snap)
              resolve(); return
            }
          }
          angleRef.current = a
          drawWheelFrame(canvasRef.current, a, snap)
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
        winnerIdPromise.then(winnerId => {
          const ws = getWheelSegments(snap).find(s => s.buyer.participant.id === winnerId)
          if (!ws) return
          const base = -Math.PI / 2 - ws.mid
          const cur = angleRef.current
          const k = Math.ceil((cur + 8 * 2 * Math.PI - base) / (2 * Math.PI))
          decelFrom = cur; decelTarget = base + k * 2 * Math.PI
          decelT0 = performance.now(); phase = 'decel'
        }).catch(() => {
          cancelAnimationFrame(rafRef.current)
          spinningRef.current = false; resolve()
        })
      })
    }
  }), [buyers])

  return <canvas ref={canvasRef} width={340} height={340} style={{ maxWidth: '100%', display: 'block' }} />
})
SpinningWheel.displayName = 'SpinningWheel'

// ─── Participant Autocomplete ─────────────────────────────────────────────────

function ParticipantAutocomplete({
  participants,
  value,
  onChange,
}: {
  participants: Participant[]
  value: string
  onChange: (id: number | '', label: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = value.trim() === ''
    ? participants
    : participants.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase()) ||
        p.tag.toLowerCase().includes(value.toLowerCase())
      )

  useEffect(() => { setHighlighted(0) }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (p: Participant) => {
    onChange(p.id, `${p.name} (${p.tag})`)
    setOpen(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) select(filtered[highlighted]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        className="form-control"
        placeholder="Søk navn eller tag..."
        value={value}
        onChange={e => { onChange('', e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', zIndex: 100, top: 'calc(100% + 2px)', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={() => select(p)}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.5rem 0.75rem', cursor: 'pointer',
                background: i === highlighted ? 'rgba(114,47,55,0.08)' : 'transparent',
              }}
            >
              <ParticipantAvatar participant={p} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
              <span className="badge badge-wine" style={{ marginLeft: 'auto' }}>{p.tag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────

function ParticipantAvatar({ participant, size, highlight }: { participant: Participant; size?: string; highlight?: boolean }) {
  const cls = `avatar${size === 'xl' ? ' avatar-xl' : size === 'lg' ? ' avatar-lg' : ''}`
  const inner = participant.hasPhoto
    ? <img src={`/api/participants/${participant.id}/photo`} alt={participant.name} className={cls} />
    : <div className={cls} style={{ background: tagColor(participant.tag) }}>{participant.tag.toUpperCase()}</div>

  if (highlight !== undefined) {
    return (
      <div style={{
        border: highlight ? '4px solid var(--gold)' : '4px solid transparent',
        borderRadius: '50%',
        boxShadow: highlight ? '0 0 20px rgba(197,160,40,0.6)' : 'none',
        transition: 'all 0.3s',
      }}>
        {inner}
      </div>
    )
  }
  return inner
}

function ParticipantAvatarById({ participantId, buyers }: { participantId: number; buyers: Buyer[] }) {
  const participant = buyers.find(b => b.participant.id === participantId)?.participant
  if (!participant) return null
  return <ParticipantAvatar participant={participant} />
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    OPEN: { label: 'Åpent', cls: 'badge-green' },
    DRAWING: { label: 'Trekning', cls: 'badge-gold' },
    CLOSED: { label: 'Avsluttet', cls: 'badge-wine' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'badge-wine' }
  return <span className={`badge ${cls}`}>{label}</span>
}

function tagColor(tag: string) {
  const colors = ['#722F37', '#2d4a7a', '#2d7a5a', '#7a4a2d', '#5a2d7a', '#7a2d6a']
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function fireConfetti() {
  const end = Date.now() + 3500
  const colors = ['#722F37', '#C5A028', '#ffffff', '#9b4a54']
  const frame = () => {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors })
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}
