import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { AllTimeStatistics, InventoryItem, LotteryStatistics, Streak, Winner } from '../types'
import NavBar from '../components/NavBar'
import { ImageLightbox } from './admin/shared'

export default function StatisticsPage() {
  const [stats, setStats] = useState<AllTimeStatistics | null>(null)
  const [lotteries, setLotteries] = useState<LotteryStatistics[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLottery, setExpandedLottery] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const [selectedParticipant, setSelectedParticipant] = useState<SelectedParticipant | null>(null)
  useEffect(() => {
    api.get<AllTimeStatistics>('/api/statistics')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
    api.get<LotteryStatistics[]>('/api/statistics/lotteries')
      .then(r => {
        setLotteries(r.data)
        if (r.data.length > 0) setExpandedLottery(r.data[0].lotteryId)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="page">
      <NavBar />

      <div className="page-header">
        <div className="container">
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🏆</div>
          <h1 className="page-title">Hall of Vino</h1>
          <p className="page-subtitle">Her måles flaks i flasker.</p>
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" />
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Henter skjendigheter fra arkivet...</p>
            </div>
          ) : !stats || stats.totalLotteries === 0 ? (
            <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🕰️</div>
                <h3 style={{ marginBottom: '0.5rem' }}>Arkivet støver</h3>
                <p style={{ color: 'var(--text-muted)' }}>Ingen avsluttede lotterier ennå. Historien skrives én flaske om gangen.</p>
                <Link to="/"><button className="btn btn-outline" style={{ marginTop: '1rem' }}>← Tilbake til kjellerdøra</button></Link>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Header summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                <StatCard emoji="🍾" label="Lotterier avholdt" value={stats.totalLotteries.toString()} />
                <StatCard emoji="🧑‍🤝‍🧑" label="Ivrige loddkjøpere" value={stats.totalParticipants.toString()} />
                <StatCard emoji="🎟️" label="Lodd kjøpt totalt" value={lotteries.reduce((s, l) => s + l.totalTickets, 0).toString()} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>

                {/* Top 5 heldigste */}
                {stats.topLucky.length > 0 && (
                  <div className="card">
                    <div className="card-header" style={{ background: 'var(--gold)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🍀 Topp gullhår
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr><th>#</th><th>Navn</th><th>Vinprosent</th></tr>
                        </thead>
                        <tbody>
                          {stats.topLucky.map((p, i) => (
                            <tr key={p.participantId}>
                              <td><MedalBadge rank={i} /></td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <div>
                                    <ParticipantLink id={p.participantId} name={p.name} onOpen={setSelectedParticipant} style={{ fontWeight: 600 }} />
                                    {i === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--gold)' }}>👑 Universets yndling</div>}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--wine)' }}>
                                  {(p.totalWins / p.totalTicketsBought * 100).toFixed(2)}%
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {p.totalTicketsBought} lodd → {p.totalWins} vin
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Top 5 uheldigste */}
                {stats.topUnlucky.length > 0 && (
                  <div className="card">
                    <div className="card-header" style={{ background: '#4a4a5a', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      😢 Loddenes fiender
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr><th>#</th><th>Navn</th><th>Vinprosent</th></tr>
                        </thead>
                        <tbody>
                          {stats.topUnlucky.map((p, i) => (
                            <tr key={p.participantId}>
                              <td>
                                <span style={{ fontSize: '1rem' }}>{['😭', '😤', '😩', '🫠', '💀'][i] ?? `#${i + 1}`}</span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <ParticipantLink id={p.participantId} name={p.name} onOpen={setSelectedParticipant} style={{ fontWeight: 600 }} />
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                                  {(p.totalTicketsBought > 0 ? p.totalWins / p.totalTicketsBought * 100 : 0).toFixed(2)}%
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {p.totalTicketsBought} lodd → {p.totalWins} vin
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>

              {/* Top ticket buyers */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🎟️ Loddenes store finansiører
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr><th>#</th><th>Navn</th><th>Lodd kjøpt</th><th>Viner vunnet</th><th>Deltatt i</th></tr>
                    </thead>
                    <tbody>
                      {stats.topTicketBuyers.map((p, i) => (
                        <tr key={p.participantId}>
                          <td><MedalBadge rank={i} /></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <ParticipantLink id={p.participantId} name={p.name} onOpen={setSelectedParticipant} style={{ fontWeight: 600 }} />
                            </div>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {p.totalTicketsBought}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.3rem' }}>
                              lodd
                            </span>
                          </td>
                          <td>
                            {p.totalWins > 0
                              ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                                  🍾 {p.totalWins}
                                  <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                                    ({(p.totalWins / p.totalTicketsBought * 100).toFixed(2)}%)
                                  </span>
                                </span>
                              : <span style={{ color: 'var(--text-muted)' }}>–</span>}
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.lotteriesParticipated} {p.lotteriesParticipated === 1 ? 'lotteri' : 'lotterier'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Streaks */}
              {(stats.longestWinStreak.length > 0 || stats.longestLoseStreak.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {stats.longestWinStreak.length > 0 && <StreakCard streaks={stats.longestWinStreak} type="win" onOpenParticipant={setSelectedParticipant} />}
                  {stats.longestLoseStreak.length > 0 && <StreakCard streaks={stats.longestLoseStreak} type="lose" onOpenParticipant={setSelectedParticipant} />}
                </div>
              )}

              {/* Per-lottery results */}
              {lotteries.length > 0 && (
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--wine)' }}>
                    🍾 Trekkingsarkiv
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {lotteries.map(lottery => (
                      <div key={lottery.lotteryId} className="card">
                        <button
                          onClick={() => setExpandedLottery(expandedLottery === lottery.lotteryId ? null : lottery.lotteryId)}
                          style={{
                            width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                            padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '1rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.3rem' }}>🍷</span>
                            <div>
                              <div style={{ fontWeight: 700 }}>{lottery.lotteryName}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {lottery.winners.length} vinnere · {lottery.totalTickets} lodd · {lottery.totalAmountNok} kr
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {/* The expanded view lists the winners in full, so the summary badges only show while collapsed */}
                            {expandedLottery !== lottery.lotteryId && <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {lottery.winners.map(w => (
                                <span key={w.position} className="badge badge-wine" style={{ fontSize: '0.7rem' }}>
                                  #{w.position} {w.participantTag}
                                </span>
                              ))}
                            </div>}
                            <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem', flexShrink: 0 }}>
                              {expandedLottery === lottery.lotteryId ? '▲' : '▼'}
                            </span>
                          </div>
                        </button>

                        {expandedLottery === lottery.lotteryId && (
                          <div style={{ borderTop: '1px solid var(--border)' }}>
                            {/* Winners list */}
                            <div style={{ padding: '1rem 1.5rem 0.5rem' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Vinnere
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '0.75rem' }}>
                                {lottery.winners.map(w => <WinnerCard key={w.position} winner={w} onImageClick={setLightbox} onOpenParticipant={setSelectedParticipant} />)}
                              </div>
                            </div>

                            {/* Participant table */}
                            <div style={{ overflowX: 'auto', padding: '0.5rem 0 0' }}>
                              <table className="table">
                                <thead>
                                  <tr><th>Deltaker</th><th>Lodd</th><th>Andel</th><th>Gevinst</th></tr>
                                </thead>
                                <tbody>
                                  {lottery.participants.map(p => (
                                    <tr key={p.participantId}>
                                      <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <ParticipantLink id={p.participantId} name={p.name} onOpen={setSelectedParticipant} style={{ fontWeight: 600 }} />
                                        </div>
                                      </td>
                                      <td style={{ fontWeight: 700 }}>{p.ticketsBought}</td>
                                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {lottery.totalTickets > 0 ? (p.ticketsBought / lottery.totalTickets * 100).toFixed(1) : 0}%
                                      </td>
                                      <td>
                                        {p.wins > 0
                                          ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>🍾 {p.wins}</span>
                                          : <span style={{ color: 'var(--text-muted)' }}>–</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                🍷 Ingen viner ble skadet i produksjonen av denne statistikken 🍷
              </div>

            </div>
          )}
        </div>
      </div>
      {selectedParticipant && (
        <WinningsModal participant={selectedParticipant} lotteries={lotteries} lightboxOpen={lightbox !== null}
          onImageClick={setLightbox} onClose={() => setSelectedParticipant(null)} />
      )}
      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
      <footer style={{ textAlign: 'center', padding: '2rem 1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.78rem', borderTop: '1px solid var(--border)', marginTop: '1rem' }}>
        🔒 Dette lotteriet er et internt kontorarrangement forbeholdt ansatte i Integrasjonssystmer AS.<br />
        Deltakelse er frivillig. Organisert i henhold til norsk lotteriveiledning for lukkede kretser.<br />
        Ikke åpent for offentligheten.
      </footer>
    </div>
  )
}

function StreakCard({ streaks, type, onOpenParticipant }: { streaks: Streak[]; type: 'win' | 'lose'; onOpenParticipant: OpenParticipant }) {
  const isWin = type === 'win'
  const streak = streaks[0].streak
  return (
    <div className="card">
      <div className="card-header" style={{ background: isWin ? 'var(--wine)' : '#4a4a5a', color: 'white' }}>
        {isWin ? '🔥 Ustoppelig vinmaskin' : '🌧️ Kjellerdøra nekter å åpne seg'}
      </div>
      <div style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '0.1em', padding: '0.75rem 1.25rem 0' }}>
        {isWin
          ? Array(streak).fill('🍷').join('')
          : <span style={{ color: 'var(--danger)' }}>{Array(streak).fill('✕').join('')}</span>}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.25rem 1.25rem 0.5rem' }}>
        {isWin
          ? `${streak} trekkinger på rad. Flaks eller verdig?`
          : `${streak} trekkinger på rad uten en eneste flaske.`}
      </div>
      {streaks.map(s => (
        <div key={s.participantId} className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
          <div>
            <ParticipantLink id={s.participantId} name={s.name} onOpen={onOpenParticipant} style={{ fontWeight: 700, fontSize: '1rem' }} />
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{s.lotteriesParticipated} totalt deltatt</div>
          </div>
        </div>
      ))}
    </div>
  )
}

type SelectedParticipant = { id: number; name: string }
type OpenParticipant = (participant: SelectedParticipant) => void
type OpenImage = (image: { src: string; alt: string }) => void

function ParticipantLink({ id, name, label, onOpen, style }: { id: number; name: string; label?: string; onOpen: OpenParticipant; style?: CSSProperties }) {
  return (
    <button type="button" className="link-button" style={style} title={`Se gevinstene til ${name}`} onClick={() => onOpen({ id, name })}>
      {label ?? name}
    </button>
  )
}

function WinnerCard({ winner, onImageClick, onOpenParticipant }: { winner: Winner; onImageClick: OpenImage; onOpenParticipant: OpenParticipant }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.9rem', background: 'rgba(114,47,55,0.05)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontWeight: 800, color: 'var(--wine)', flexShrink: 0 }}>#{winner.position}</span>
        <ParticipantLink id={winner.participantId} name={winner.participantName} label={winner.participantTag} onOpen={onOpenParticipant}
          style={{ fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>lodd #{winner.ticketNumber}</span>
      </div>
      <div style={{ padding: '0.6rem 0.9rem' }}>
        <PrizeItems items={winner.prize?.items ?? []} onImageClick={onImageClick} />
      </div>
    </div>
  )
}

// Wins from before prizes were tracked point at placeholder bottles (codes UKJENT-150, UKJENT-250) that only
// carry an estimated value for the cellar balance; that value isn't shown here, so neither is the estimate wording
function isUnknownPrize(item: InventoryItem) {
  return item.vinmonopoletCode.startsWith('UKJENT')
}

function PrizeItems({ items, onImageClick }: { items: InventoryItem[]; onImageClick: OpenImage }) {
  if (items.length === 0) {
    return <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ingen premie registrert</span>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((item, i) => {
        const unknown = isUnknownPrize(item)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 36, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', borderRadius: 4 }}>
              {unknown ? (
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-muted)' }}>?</span>
              ) : (
                <img src={item.imageUrl} alt={item.name}
                  onClick={() => onImageClick({ src: item.imageUrl, alt: item.name })}
                  title="Klikk for å forstørre"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'zoom-in' }}
                  onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={item.name}>
                {unknown ? 'Ukjent premie' : item.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {unknown ? 'Vunnet før premiene ble registrert' : item.category}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Built from the draw archive, which holds every closed lottery, so no extra request is needed
function WinningsModal({ participant, lotteries, lightboxOpen, onImageClick, onClose }: {
  participant: SelectedParticipant
  lotteries: LotteryStatistics[]
  lightboxOpen: boolean
  onImageClick: OpenImage
  onClose: () => void
}) {
  useEffect(() => {
    // Escape closes an enlarged image first; the lightbox handles that keypress itself
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !lightboxOpen) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightboxOpen, onClose])

  const entered = lotteries.filter(l => l.participants.some(p => p.participantId === participant.id))
  const tickets = entered.reduce((sum, l) => sum + (l.participants.find(p => p.participantId === participant.id)?.ticketsBought ?? 0), 0)
  const won = lotteries
    .map(l => ({ lottery: l, wins: l.winners.filter(w => w.participantId === participant.id) }))
    .filter(l => l.wins.length > 0)
  const winCount = won.reduce((sum, l) => sum + l.wins.length, 0)

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: 'calc(100vh - 2rem)', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div>{participant.name}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {winCount} {winCount === 1 ? 'gevinst' : 'gevinster'} · {tickets} lodd · {entered.length} {entered.length === 1 ? 'lotteri' : 'lotterier'}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Lukk"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)', lineHeight: 1 }}>
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {won.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🫠</div>
              Ingen gevinster ennå. Neste gang, kanskje.
            </div>
          ) : won.map(({ lottery, wins }) => (
            <div key={lottery.lotteryId}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, flex: 1, minWidth: 0 }}>{lottery.lotteryName}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {new Date(lottery.createdAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {wins.map(w => (
                  <div key={w.position} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.6rem 0.9rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--wine)', fontSize: '0.85rem' }}>#{w.position}</span> · lodd #{w.ticketNumber}
                    </div>
                    <PrizeItems items={w.prize?.items ?? []} onImageClick={onImageClick} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MedalBadge({ rank }: { rank: number }) {
  if (rank === 0) return <span style={{ fontSize: '1.1rem' }}>🥇</span>
  if (rank === 1) return <span style={{ fontSize: '1.1rem' }}>🥈</span>
  if (rank === 2) return <span style={{ fontSize: '1.1rem' }}>🥉</span>
  return <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>#{rank + 1}</span>
}

function StatCard({ emoji, label, value, sub }: { emoji: string; label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="card-body" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.8rem' }}>{emoji}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--wine)' }}>{value}</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginTop: '0.2rem' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem', fontStyle: 'italic' }}>{sub}</div>}
      </div>
    </div>
  )
}