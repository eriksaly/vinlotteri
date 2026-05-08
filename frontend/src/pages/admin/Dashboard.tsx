import { useEffect, useState, useRef, useCallback, ReactNode } from 'react'
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
            <Link to="/statistikk" className="nav-link">Hall of Fame</Link>
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
        <div className="card">
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
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null)
  const [latestWinner, setLatestWinner] = useState<Winner | null>(null)
  const [, setRemainingTickets] = useState<number>(0)
  const [wineCount, setWineCount] = useState(5)
  const [showStartForm, setShowStartForm] = useState(false)
  const { confirm, dialog } = useConfirm()
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    const allParticipants = buyers.flatMap(b => Array(b.ticketCount).fill(b.participant))
    if (allParticipants.length === 0) { setAnimating(false); return }
    // Shuffle so the weighted pool doesn't cycle in ticket-order
    for (let i = allParticipants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allParticipants[i], allParticipants[j]] = [allParticipants[j], allParticipants[i]]
    }

    // Start the animation immediately, fetch result in parallel
    const drawPromise = api.post<DrawResult>('/api/admin/lottery/draw')
    let idx = 0
    const duration = 3000
    const startTime = Date.now()

    const step = () => {
      const elapsed = Date.now() - startTime
      if (elapsed >= duration) return
      const progress = elapsed / duration
      const interval = 60 + 400 * (progress * progress)
      idx = (idx + 1) % allParticipants.length
      setCurrentParticipant(allParticipants[idx])
      animationRef.current = setTimeout(step, interval)
    }
    animationRef.current = setTimeout(step, 60)

    try {
      const result = await drawPromise
      const winner = result.data.winner
      const winnerParticipant = buyers.find(b => b.participant.id === winner.participantId)?.participant ?? allParticipants[0]

      // Wait for animation to finish then reveal
      setTimeout(() => {
        if (animationRef.current) clearTimeout(animationRef.current)
        setCurrentParticipant(winnerParticipant)
        setLatestWinner(winner)
        setRemainingTickets(result.data.remainingTickets)
        setWinners(prev => [...prev, winner])
        setAnimating(false)
        fireConfetti()
      }, duration + 200)
    } catch (e: unknown) {
      if (animationRef.current) clearTimeout(animationRef.current)
      setAnimating(false)
      setCurrentParticipant(null)
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
          {/* Animation stage */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--wine-dark) 0%, var(--wine) 100%)',
              padding: '2.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              minHeight: 280,
            }}>
              {currentParticipant ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ position: 'relative' }}>
                    <ParticipantAvatar participant={currentParticipant} size="xl" highlight={!!latestWinner} />
                    {latestWinner && <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '2rem' }}>🏆</div>}
                  </div>
                  <div style={{ color: 'white', textAlign: 'center' }}>
                    <div style={{ fontSize: animating ? '1.1rem' : '1.8rem', fontWeight: 800, transition: 'font-size 0.3s' }}>
                      {currentParticipant.name}
                    </div>
                    {latestWinner && (
                      <div style={{ color: 'var(--gold-light)', fontSize: '1rem', marginTop: '0.3rem' }}>
                        🎟️ Lodd #{latestWinner.ticketNumber} · Gevinst #{latestWinner.position}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem' }}>
                  Trykk "Trekk neste vinner" for å starte!
                </div>
              )}

              {isDrawing && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    className="btn btn-gold btn-xl"
                    onClick={drawWinner}
                    disabled={animating || winners.length >= (lottery?.wineCount ?? 999)}
                    style={{ marginTop: '0.5rem' }}
                  >
                    {animating ? '🎰 Skjebnen avgjøres...' : winners.length >= (lottery?.wineCount ?? 999) ? '🏁 Kjelleren er tom!' : '🎰 Trekk neste vinner'}
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
  if (n === 2) return '😬 Kun 2 stakkar igjen uten vin...'
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
          background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
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
