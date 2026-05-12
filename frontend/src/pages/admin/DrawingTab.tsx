import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import confetti from 'canvas-confetti'
import api from '../../api/client'
import { playTick, playWin } from '../../audio'
import type { Buyer, LotteryInfo, Winner, DrawResult } from '../../types'
import { useConfirm } from './shared'

const OVERLAY_Z = 2000
const CONFETTI_Z = OVERLAY_Z + 1000

export default function DrawingTab({ lottery, onLotteryChange }: { lottery: LotteryInfo | null; onLotteryChange: () => Promise<void> }) {
  const [winners, setWinners] = useState<Winner[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [animating, setAnimating] = useState(false)
  const [latestWinner, setLatestWinner] = useState<Winner | null>(null)
  const [, setRemainingTickets] = useState<number>(0)
  const [wineCount, setWineCount] = useState(5)
  const [showStartForm, setShowStartForm] = useState(false)
  const [showWheel, setShowWheel] = useState(false)
  const { confirm, dialog } = useConfirm()
  const wheelRef = useRef<WheelHandle>(null)

  useEffect(() => {
    if (!showWheel) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !animating) setShowWheel(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showWheel, animating])

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
    setShowWheel(true)
    setAnimating(true)
    setLatestWinner(null)

    // Wait two frames for overlay to mount and ResizeObserver to fire
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

    let resolveWinner!: (v: { participantId: number; ticketNumber: number }) => void
    let rejectWinner!: (e: unknown) => void
    const winnerPromise = new Promise<{ participantId: number; ticketNumber: number }>((res, rej) => { resolveWinner = res; rejectWinner = rej })
    const spinPromise = wheelRef.current?.spin(winnerPromise) ?? Promise.resolve()

    try {
      const result = await api.post<DrawResult>('/api/admin/lottery/draw')
      resolveWinner({ participantId: result.data.winner.participantId, ticketNumber: result.data.winner.ticketNumber })
      await spinPromise
      setLatestWinner(result.data.winner)
      setRemainingTickets(result.data.remainingTickets)
      setWinners(prev => [...prev, result.data.winner])
      const b = await api.get<Buyer[]>('/api/admin/buyers')
      setBuyers(b.data)
      setAnimating(false)
      fireConfetti()
    } catch (e: unknown) {
      rejectWinner(e)
      setAnimating(false)
      setShowWheel(false)
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
  const allDrawn = winners.length >= (lottery?.wineCount ?? 999)

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

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    className="btn btn-gold btn-xl"
                    onClick={drawWinner}
                    disabled={animating || allDrawn}
                  >
                    {animating ? '🎰 Skjebnen avgjøres...' : allDrawn ? '🏁 Kjelleren er tom!' : '🎰 Trekk vin'}
                  </button>
                  {lottery?.wineCount != null && winners.length < lottery.wineCount && !animating && (
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
              onClick={() => { if (!animating && winners.length < (lottery?.wineCount ?? 999)) drawWinner() }}
              style={{
                position: 'fixed', inset: 0, zIndex: OVERLAY_Z,
                background: 'linear-gradient(135deg, #1a0a0d 0%, #2a1215 30%, #1a0a0d 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: animating || allDrawn ? 'default' : 'pointer',
              }}>
              {/* Close button */}
              {!animating && (
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

              {/* Wheel */}
              <div style={{
                width: '100vw', height: '100vh',
                position: 'relative',
                opacity: latestWinner && !animating ? 0.3 : 1,
                transition: 'opacity 0.5s',
              }}>
                <SpinningWheel ref={wheelRef} buyers={buyers} />
              </div>

              {/* Winner announcement */}
              {latestWinner && !animating && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
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
                </div>
              )}

              {/* Bottles remaining */}
              {lottery?.wineCount != null && winners.length < lottery.wineCount && !animating && (
                <div style={{
                  position: 'absolute', bottom: '2rem', left: 0, right: 0,
                  textAlign: 'center', pointerEvents: 'none',
                  color: 'rgba(255,255,255,0.7)', fontSize: 'min(3vw, 3vh)',
                }}>
                  {winesLeftMessage(lottery.wineCount - winners.length)}
                </div>
              )}

              {/* Winners list */}
              {winners.length > 0 && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', bottom: '1.5rem', right: '1.5rem', zIndex: 10,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                    minWidth: 180, maxHeight: 'calc(100vh - 3rem)', overflowY: 'auto',
                    cursor: 'default',
                  }}
                >
                  <div style={{
                    padding: '0.6rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 700,
                  }}>
                    🏆 Vinnere ({winners.length}{lottery?.wineCount ? `/${lottery.wineCount}` : ''})
                  </div>
                  {[...winners].reverse().map(w => (
                    <div key={w.position} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.45rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', minWidth: 20 }}>#{w.position}</span>
                      <span style={{ fontWeight: 700, color: 'white', flex: 1, fontSize: '0.9rem' }}>{w.participantTag}</span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>#{w.ticketNumber}</span>
                    </div>
                  ))}
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
  const colors = ['#722F37', '#C5A028', '#ffffff', '#9b4a54']
  const frame = () => {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors, zIndex: CONFETTI_Z })
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors, zIndex: CONFETTI_Z })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
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

  useEffect(() => {
    if (!spinningRef.current) drawWheelFrame(canvasRef.current, angleRef.current, buyers)
  }, [buyers])

  useImperativeHandle(ref, () => ({
    spin(winnerPromise: Promise<{ participantId: number; ticketNumber: number }>): Promise<void> {
      return new Promise(resolve => {
        if (spinningRef.current) { resolve(); return }
        spinningRef.current = true
        cancelAnimationFrame(rafRef.current)
        const snap = buyers.slice()
        const startAngle = angleRef.current
        const t0 = performance.now()
        const FAST = 0.006
        let phase: 'fast' | 'decel' = 'fast'
        let decelFrom = 0, decelTarget = 0, decelT0 = 0
        const DECEL_MS = 8000
        const TICK_INTERVAL = Math.PI / 7
        let lastTickAngle = startAngle
        const loop = () => {
          const now = performance.now()
          let a: number
          let speed = 1
          if (phase === 'fast') {
            a = startAngle + FAST * (now - t0)
          } else {
            const p = Math.min(1, (now - decelT0) / DECEL_MS)
            speed = 1 - p
            a = decelFrom + (decelTarget - decelFrom) * (1 - Math.pow(1 - p, 3))
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
      if (!spinningRef.current) drawWheelFrame(canvas, angleRef.current, buyers)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [buyers])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
})
SpinningWheel.displayName = 'SpinningWheel'
