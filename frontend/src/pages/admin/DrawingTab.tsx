import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import confetti from 'canvas-confetti'
import api from '../../api/client'
import { playTick, playWin } from '../../audio'
import type { Buyer, LotteryInfo, LotteryPrize, Winner, DrawResult } from '../../types'
import { useConfirm } from './shared'

const OVERLAY_Z = 2000
const CONFETTI_Z = OVERLAY_Z + 1000

export default function DrawingTab({ lottery, onLotteryChange }: { lottery: LotteryInfo | null; onLotteryChange: () => Promise<void> }) {
  const [winners, setWinners] = useState<Winner[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [prizes, setPrizes] = useState<LotteryPrize[]>([])
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'winner' | 'nextPrize'>('idle')
  const [latestWinner, setLatestWinner] = useState<Winner | null>(null)
  const [, setRemainingTickets] = useState<number>(0)
  const [wineCount, setWineCount] = useState(5)
  const [showStartForm, setShowStartForm] = useState(false)
  const [showWheel, setShowWheel] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const { confirm, dialog } = useConfirm()
  const wheelRef = useRef<WheelHandle>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!showWheel) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'spinning') setShowWheel(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showWheel, phase])

  const load = useCallback(async () => {
    const [w, b, p] = await Promise.all([
      api.get<Winner[]>('/api/admin/winners'),
      api.get<Buyer[]>('/api/admin/buyers'),
      api.get<LotteryPrize[]>('/api/admin/lottery/current/prizes'),
    ])
    setWinners(w.data)
    setBuyers(b.data)
    setPrizes(p.data)
    setWineCount(p.data.length > 0 ? p.data.length : 5)
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
      setToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil')
    }
  }

  const drawWinner = async () => {
    if (phase === 'spinning') return
    setShowWheel(true)
    setPhase('spinning')
    setLatestWinner(null)

    // Wait two frames for overlay to mount and ResizeObserver to fire
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

    // Pause 1 s so viewers can orient on the wheel before it starts spinning
    await new Promise(r => setTimeout(r, 1000))

    let resolveWinner!: (v: { participantId: number; ticketNumber: number }) => void
    let rejectWinner!: (e: unknown) => void
    const winnerPromise = new Promise<{ participantId: number; ticketNumber: number }>((res, rej) => { resolveWinner = res; rejectWinner = rej })
    // Guarantee at least 3 s of fast-spinning before deceleration kicks in
    const spinPromise = wheelRef.current?.spin(
      Promise.all([winnerPromise, new Promise<void>(r => setTimeout(r, 3000))]).then(([w]) => w)
    ) ?? Promise.resolve()

    try {
      const result = await api.post<DrawResult>('/api/admin/lottery/draw')
      resolveWinner({ participantId: result.data.winner.participantId, ticketNumber: result.data.winner.ticketNumber })
      await spinPromise
      setLatestWinner(result.data.winner)
      setRemainingTickets(result.data.remainingTickets)
      setWinners(prev => [...prev, result.data.winner])
      const [b, p] = await Promise.all([
        api.get<Buyer[]>('/api/admin/buyers'),
        api.get<LotteryPrize[]>('/api/admin/lottery/current/prizes'),
      ])
      setBuyers(b.data)
      setPrizes(p.data)
      setPhase('winner')
      fireConfetti()
    } catch (e: unknown) {
      rejectWinner(e)
      setPhase('idle')
      setShowWheel(false)
      setToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved trekning')
    }
  }

  const finishLottery = async () => {
    if (!await confirm('Avslutte lotteriet? Statistikken blir offentlig tilgjengelig.')) return
    try {
      await api.post('/api/admin/lottery/finish')
      await onLotteryChange()
    } catch (e: unknown) {
      setToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil')
    }
  }

  const isOpen = lottery?.status === 'OPEN'
  const isDrawing = lottery?.status === 'DRAWING'
  const totalTickets = buyers.reduce((s, b) => s + b.ticketCount, 0)
  const allDrawn = winners.length >= (lottery?.wineCount ?? 999)
  const nextPrizePosition = winners.length + 1
  const nextPrize = prizes.find(p => p.position === nextPrizePosition) ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {toast && (
        <div style={{
          padding: '0.75rem 1.25rem', borderRadius: 8, fontWeight: 500, fontSize: '0.9rem',
          background: '#7f1d1d', color: 'white', border: '1px solid #991b1b',
        }}>
          ⚠️ {toast}
        </div>
      )}
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
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Spinning wheel stage */}
            <div className="card" style={{ overflow: 'hidden', flex: '1 1 340px' }}>
              <div style={{
                background: 'linear-gradient(135deg, var(--wine-dark) 0%, var(--wine) 100%)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.2rem',
              }}>
                <div style={{ width: 520, height: 520, maxWidth: '100%', aspectRatio: '1' }}>
                  {!showWheel && <SpinningWheel ref={wheelRef} buyers={buyers} />}
                </div>

                {latestWinner && phase === 'idle' && (
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

                {nextPrize && !allDrawn && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    background: 'rgba(255,255,255,0.08)', borderRadius: 12,
                    padding: '0.75rem 1.25rem', border: '1px solid rgba(255,255,255,0.15)',
                  }}>
                    {nextPrize.items.length > 0 ? (
                      <>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {nextPrize.items.map(item => (
                            <img key={item.id} src={item.imageUrl} alt={item.name}
                              style={{ width: 56, height: 80, objectFit: 'contain', borderRadius: 6 }}
                              onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                          ))}
                        </div>
                        <div style={{ color: 'white' }}>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem' }}>
                            Premie #{nextPrize.position}
                          </div>
                          {nextPrize.items.map(item => (
                            <div key={item.id} style={{ fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.4 }}>{item.name}</div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                        Premie #{nextPrize.position} — flaske ikke tildelt
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    className="btn btn-gold btn-xl"
                    onClick={drawWinner}
                    disabled={phase === 'spinning' || allDrawn}
                  >
                    {phase === 'spinning' ? '🎰 Skjebnen avgjøres...' : allDrawn ? '🏁 Kjelleren er tom!' : '🎰 Trekk vin'}
                  </button>
                  {lottery?.wineCount != null && winners.length < lottery.wineCount && phase !== 'spinning' && (
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>
                      {winesLeftMessage(lottery.wineCount - winners.length)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Winners sidebar */}
            <div className="card" style={{ flex: '0 0 200px', minWidth: 160 }}>
              <div className="card-header" style={{ fontSize: '0.85rem', padding: '0.75rem 1rem' }}>
                🏆 Vinnere ({winners.length}{lottery?.wineCount ? `/${lottery.wineCount}` : ''})
              </div>
              {winners.length === 0 ? (
                <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Ingen ennå
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[...winners].reverse().map(w => (
                    <div key={w.position} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)',
                      gap: '0.5rem',
                    }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 20 }}>#{w.position}</span>
                      <span style={{ fontWeight: 700, flex: 1 }}>{w.participantTag}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{w.ticketNumber}</span>
                    </div>
                  ))}
                </div>
              )}
              {lottery?.wineCount != null && winners.length >= lottery.wineCount && (
                <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={finishLottery}>🎉 Avslutt</button>
                </div>
              )}
              {winners.length > 0 && (lottery?.wineCount == null || winners.length < lottery.wineCount) && (
                <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-outline btn-sm" style={{ width: '100%', color: 'var(--text-muted)', borderColor: 'var(--border)', fontSize: '0.75rem' }} onClick={finishLottery}>
                    Avslutt tidlig
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Full-screen wheel overlay */}
          {showWheel && (
            <div
              onClick={() => {
                if (phase === 'spinning') return
                if (phase === 'winner') { if (!allDrawn) setPhase('nextPrize'); else setShowWheel(false) }
                else if (phase === 'nextPrize') drawWinner()
              }}
              style={{
                position: 'fixed', inset: 0, zIndex: OVERLAY_Z,
                background: 'linear-gradient(135deg, #1a0a0d 0%, #2a1215 30%, #1a0a0d 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: phase === 'spinning' ? 'default' : 'pointer',
              }}>
              {/* Close button */}
              {phase !== 'spinning' && (
                <button
                  onClick={e => { e.stopPropagation(); setShowWheel(false) }}
                  style={{
                    position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10,
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white', width: 44, height: 44, borderRadius: '50%',
                    fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              )}

              {/* ── spinning + winner phases: show wheel ── */}
              {(phase === 'spinning' || phase === 'winner') && (<>
                <div style={{
                  width: '100vw', height: '100vh', position: 'relative',
                  opacity: phase === 'winner' ? 0.15 : 1,
                  transition: 'opacity 0.6s',
                }}>
                  <SpinningWheel ref={wheelRef} buyers={buyers} />
                </div>

                {/* Bottles remaining */}
                {lottery?.wineCount != null && winners.length < lottery.wineCount && phase === 'spinning' && (
                  <div style={{ position: 'absolute', bottom: '2rem', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 'min(3vw, 3vh)' }}>
                    {winesLeftMessage(lottery.wineCount - winners.length)}
                  </div>
                )}

                {/* Winners list (during spin only) */}
                {winners.length > 0 && phase === 'spinning' && (
                  <div onClick={e => e.stopPropagation()} style={{
                    position: 'absolute', bottom: '1.5rem', right: '1.5rem', zIndex: 10,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                    minWidth: 180, maxHeight: 'calc(100vh - 3rem)', overflowY: 'auto', cursor: 'default',
                  }}>
                    <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 700 }}>
                      🏆 Vinnere ({winners.length}{lottery?.wineCount ? `/${lottery.wineCount}` : ''})
                    </div>
                    {[...winners].reverse().map(w => (
                      <div key={w.position} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', minWidth: 20 }}>#{w.position}</span>
                        <span style={{ fontWeight: 700, color: 'white', flex: 1, fontSize: '0.9rem' }}>{w.participantTag}</span>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>#{w.ticketNumber}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>)}

              {/* Prize card — left side during spin */}
              {phase === 'spinning' && nextPrize && nextPrize.items.length > 0 && (
                <div style={{
                  position: 'absolute', left: '2rem', top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none', width: 'min(22vw, 240px)',
                }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '0.75rem',
                    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
                    borderRadius: 16, padding: '1.25rem',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Premie #{nextPrize.position}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      {nextPrize.items.map(item => (
                        <img key={item.id} src={item.imageUrl} alt={item.name}
                          style={{ width: `min(${Math.floor(18 / nextPrize.items.length)}vw, ${Math.floor(160 / nextPrize.items.length)}px)`, height: 'min(22vw, 200px)', objectFit: 'contain', borderRadius: 10 }}
                          onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                      ))}
                    </div>
                    <div>
                      {nextPrize.items.map(item => (
                        <div key={item.id} style={{ color: 'white', fontWeight: 600, fontSize: 'min(3vw, 1rem)', lineHeight: 1.4, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                          {item.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── winner phase: announcement ── */}
              {phase === 'winner' && latestWinner && (
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}>
                  <div style={{ color: 'white', textAlign: 'center', animation: 'modal-in 0.4s ease-out' }}>
                    <div style={{ fontSize: 'min(16vw, 16vh)', fontWeight: 800, lineHeight: 1.1 }}>
                      🏆 {latestWinner.participantTag}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'min(4vw, 4vh)', marginTop: '0.5rem' }}>
                      {latestWinner.participantName}
                    </div>
                    <div style={{ color: '#e8c84a', fontSize: 'min(5vw, 5vh)', marginTop: '0.6rem', fontWeight: 600 }}>
                      🎟️ Lodd #{latestWinner.ticketNumber} · Gevinst #{latestWinner.position}
                    </div>
                  </div>
                  {!allDrawn && (
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'min(2.5vw, 1rem)', marginTop: '3rem' }}>
                      Klikk for å avdekke neste premie →
                    </div>
                  )}
                </div>
              )}

              {/* ── nextPrize phase: big prize reveal ── */}
              {phase === 'nextPrize' && (
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '1.5rem', animation: 'modal-in 0.35s ease-out',
                }}>
                  <div style={{ fontSize: 'min(3vw, 1.1rem)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    Neste premie — #{nextPrize?.position ?? '?'}
                  </div>
                  {nextPrize && nextPrize.items.length > 0 ? (<>
                    <div style={{ display: 'flex', gap: 'min(3vw, 2rem)', justifyContent: 'center', alignItems: 'flex-end' }}>
                      {nextPrize.items.map(item => (
                        <img key={item.id} src={item.imageUrl} alt={item.name}
                          style={{ width: 'min(40vw, 380px)', height: 'min(60vh, 560px)', objectFit: 'contain', borderRadius: 12, filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.7))' }}
                          onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                      ))}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {nextPrize.items.map(item => (
                        <div key={item.id} style={{ color: 'white', fontWeight: 700, fontSize: 'min(4vw, 1.6rem)', lineHeight: 1.35 }}>{item.name}</div>
                      ))}
                    </div>
                  </>) : (
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'min(4vw, 1.4rem)' }}>Premie ikke tildelt</div>
                  )}
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'min(2.5vw, 1rem)', marginTop: '0.5rem' }}>
                    Klikk for å spinne 🎰
                  </div>
                </div>
              )}
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

function fireConfetti() {
  playWin()
  const end = Date.now() + 3500
  const colors = ['#b32020', '#c86a10', '#a08a00', '#1e7a38', '#1a4db0', '#6b1a80']
  const frame = () => {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors, zIndex: CONFETTI_Z })
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors, zIndex: CONFETTI_Z })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

// ─── Spinning Wheel ───────────────────────────────────────────────────────────

const WHEEL_COLORS = ['#b32020', '#c86a10', '#a08a00', '#1e7a38', '#1a4db0', '#6b1a80']

function getWheelSegments(buyerList: Buyer[]) {
  const total = buyerList.reduce((s, b) => s + b.ticketCount, 0)
  if (total === 0) return []
  const sorted = buyerList.slice().sort((a, b) => Math.min(...a.ticketNumbers) - Math.min(...b.ticketNumbers))
  let acc = 0
  return sorted.map((b, i) => {
    const sweep = (b.ticketCount / total) * 2 * Math.PI
    const start = acc; acc += sweep
    const ticketsSorted = b.ticketNumbers.slice().sort((a, b) => a - b)
    return { buyer: b, start, end: acc, mid: start + sweep / 2, color: WHEEL_COLORS[i % WHEEL_COLORS.length], ticketsSorted }
  })
}

function drawWheelFrame(canvas: HTMLCanvasElement | null, angle: number, buyerList: Buyer[]) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height
  const cx = W / 2, cy = H / 2
  const r = Math.min(cx, cy) * 0.92
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
    ctx.strokeStyle = 'white'; ctx.lineWidth = Math.max(1, r * 0.008); ctx.stroke()
    const sweep = seg.end - seg.start
    if (sweep > 0.12) {
      const ma = seg.mid + angle
      const fontSize = Math.max(r * 0.04, Math.min(r * 0.065, sweep * r * 0.06))
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
  const cr = r * 0.07
  ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 2 * Math.PI)
  ctx.fillStyle = 'white'; ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke()
  const pw = r * 0.055, ph = r * 0.12
  ctx.beginPath()
  ctx.moveTo(cx, cy - r + 2)
  ctx.lineTo(cx - pw, cy - r - ph); ctx.lineTo(cx + pw, cy - r - ph)
  ctx.closePath(); ctx.fillStyle = '#C5A028'; ctx.strokeStyle = 'white'; ctx.lineWidth = 2.5; ctx.fill(); ctx.stroke()
}

interface WheelHandle {
  spin: (winnerPromise: Promise<{ participantId: number; ticketNumber: number }>) => Promise<void>
}

const SpinningWheel = forwardRef<WheelHandle, { buyers: Buyer[] }>(({ buyers }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const angleRef = useRef(Math.random() * Math.PI * 2)
  const spinningRef = useRef(false)
  // Once a spin has happened, suppress external redraws until the next spin
  // starts (which picks up the new buyers via snap = buyers.slice()).
  const hasSpunRef = useRef(false)

  useEffect(() => {
    if (!spinningRef.current && !hasSpunRef.current) {
      drawWheelFrame(canvasRef.current, angleRef.current, buyers)
    }
  }, [buyers])

  useImperativeHandle(ref, () => ({
    spin(winnerPromise: Promise<{ participantId: number; ticketNumber: number }>): Promise<void> {
      return new Promise(resolve => {
        if (spinningRef.current) { resolve(); return }
        spinningRef.current = true
        hasSpunRef.current = true
        cancelAnimationFrame(rafRef.current)
        const snap = buyers.slice()
        const startAngle = angleRef.current
        const t0 = performance.now()
        // rad/ms — ~2.4 rev/s full-speed cruise
        const FAST = 0.015
        let phase: 'fast' | 'decel' = 'fast'
        let decelFrom = 0, decelTarget = 0, decelT0 = 0, decelMs = 0
        const TICK_INTERVAL = Math.PI / 7
        let lastTickAngle = startAngle
        const loop = () => {
          const now = performance.now()
          let a: number
          let speed = 1
          if (phase === 'fast') {
            a = startAngle + FAST * (now - t0)
          } else {
            const p = Math.min(1, (now - decelT0) / decelMs)
            speed = 1 - p
            // Velocity-matched decel: starts at FAST, ends at 0 — seamless from fast phase
            a = decelFrom + (decelTarget - decelFrom) * (2 * p - p * p)
            if (p >= 1) {
              angleRef.current = decelTarget
              spinningRef.current = false
              drawWheelFrame(canvasRef.current, decelTarget, snap)
              resolve(); return
            }
          }
          if (Math.abs(a - lastTickAngle) >= TICK_INTERVAL) {
            playTick(speed)
            lastTickAngle = a
          }
          angleRef.current = a
          drawWheelFrame(canvasRef.current, a, snap)
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
        winnerPromise.then(({ participantId, ticketNumber }) => {
          const ws = getWheelSegments(snap).find(s => s.buyer.participant.id === participantId)
          if (!ws) return
          const idx = ws.ticketsSorted.indexOf(ticketNumber)
          const fraction = idx >= 0 ? (idx + 0.5) / ws.ticketsSorted.length : 0.5
          const targetAngle = ws.start + fraction * (ws.end - ws.start)
          const base = -Math.PI / 2 - targetAngle
          const cur = angleRef.current
          const k = Math.ceil((cur + 12 * 2 * Math.PI - base) / (2 * Math.PI))
          decelFrom = cur; decelTarget = base + k * 2 * Math.PI
          // Duration derived from FAST so the quadratic decel starts at exactly FAST
          decelMs = (2 * (decelTarget - decelFrom)) / FAST
          decelT0 = performance.now(); phase = 'decel'
        }).catch(() => {
          cancelAnimationFrame(rafRef.current)
          spinningRef.current = false; resolve()
        })
      })
    }
  }), [buyers])

  const lastSizeRef = useRef({ w: 0, h: 0 })
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const container = canvas.parentElement
    if (!container) return
    const observer = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight
      if (w === lastSizeRef.current.w && h === lastSizeRef.current.h) return
      lastSizeRef.current = { w, h }
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      if (!spinningRef.current && !hasSpunRef.current) drawWheelFrame(canvas, angleRef.current, buyers)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [buyers])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
})
SpinningWheel.displayName = 'SpinningWheel'
