import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { AllTimeStatistics, LotteryStatistics, Streak } from '../types'
import NavBar from '../components/NavBar'

export default function StatisticsPage() {
  const [stats, setStats] = useState<AllTimeStatistics | null>(null)
  const [lotteries, setLotteries] = useState<LotteryStatistics[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLottery, setExpandedLottery] = useState<number | null>(null)
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
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>
            <span className="beach-bob">🏆</span>
            <span style={{ margin: '0 0.4rem' }}>🌞</span>
            <span className="palm-sway">🌴</span>
          </div>
          <h1 className="page-title">Hall of Rosé</h1>
          <p className="page-subtitle">Her måles flaks i flasker og solskinn i statistikk. 🍹</p>
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" />
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Henter historier fra strandarkivet... 📚🌊</p>
            </div>
          ) : !stats || stats.totalLotteries === 0 ? (
            <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}><span className="beach-bob">🏖️</span></div>
                <h3 style={{ marginBottom: '0.5rem' }}>Strandarkivet er tomt</h3>
                <p style={{ color: 'var(--text-muted)' }}>Ingen avsluttede lotterier ennå. Historien skrives én flaske og én solstråle om gangen.</p>
                <Link to="/"><button className="btn btn-outline" style={{ marginTop: '1rem' }}>← Tilbake til strandbaren</button></Link>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Header summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                <StatCard emoji="🍾" label="Strandfester avholdt" value={stats.totalLotteries.toString()} />
                <StatCard emoji="🕶️" label="Solbriller på jakt etter flaks" value={stats.totalParticipants.toString()} />
                <StatCard emoji="🎟️" label="Lodd kastet i sanden" value={lotteries.reduce((s, l) => s + l.totalTickets, 0).toString()} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>

                {/* Top 5 heldigste */}
                {stats.topLucky.length > 0 && (
                  <div className="card">
                    <div className="card-header" style={{ background: 'var(--sunny-gradient)', color: '#4a2c00', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🌞 Solkyssede vinnere
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
                                  <MiniAvatar participant={p} />
                                  <div>
                                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                                    {i === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--gold)' }}>👑 Solens yndling</div>}
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
                    <div className="card-header" style={{ background: 'var(--ocean-gradient)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🌧️ Skyer over solsenga
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
                                  <MiniAvatar participant={p} />
                                  <span style={{ fontWeight: 600 }}>{p.name}</span>
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
                  💸 Strandbarens beste kunder
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
                              <MiniAvatar participant={p} />
                              <span style={{ fontWeight: 600 }}>{p.name}</span>
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
                  {stats.longestWinStreak.length > 0 && <StreakCard streaks={stats.longestWinStreak} type="win" />}
                  {stats.longestLoseStreak.length > 0 && <StreakCard streaks={stats.longestLoseStreak} type="lose" />}
                </div>
              )}

              {/* Per-lottery results */}
              {lotteries.length > 0 && (
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--wine)' }}>
                    🍾 Strandfest-arkivet
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
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              {lottery.winners.map(w => (
                                <span key={w.position} className="badge badge-wine" style={{ fontSize: '0.7rem' }}>
                                  #{w.position} {w.participantTag}
                                </span>
                              ))}
                            </div>
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {lottery.winners.map(w => {
                                  const p = lottery.participants.find(p => p.participantId === w.participantId)
                                  return (
                                    <div key={w.position} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                      <span style={{ fontWeight: 800, color: 'var(--wine)', minWidth: '1.5rem', fontSize: '1.1rem' }}>
                                        {`#${w.position}`}
                                      </span>
                                      {p && <MiniAvatar participant={p} />}
                                      <span style={{ fontWeight: 700 }}>{w.participantTag}</span>
                                      <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        lodd #{w.ticketNumber}
                                      </span>
                                    </div>
                                  )
                                })}
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
                                          <MiniAvatar participant={p} />
                                          <span style={{ fontWeight: 600 }}>{p.name}</span>
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
                🌴 Ingen paraply-drinker ble skadet i produksjonen av denne statistikken 🍹
              </div>

            </div>
          )}
        </div>
      </div>
      <footer style={{ textAlign: 'center', padding: '2rem 1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.78rem', borderTop: '1px solid var(--border)', marginTop: '1rem' }}>
        🏖️ Dette lotteriet er et internt strandarrangement forbeholdt ansatte i Integrasjonssystemer AS.<br />
        Deltakelse er frivillig. Organisert i henhold til norsk lotteriveiledning for lukkede kretser.<br />
        Ikke åpent for turister som havnet på feil brygge. 🌊
      </footer>
    </div>
  )
}

function StreakCard({ streaks, type }: { streaks: Streak[]; type: 'win' | 'lose' }) {
  const isWin = type === 'win'
  const streak = streaks[0].streak
  return (
    <div className="card">
      <div className="card-header" style={{ background: isWin ? 'var(--sunset-gradient)' : 'var(--ocean-gradient)', color: 'white' }}>
        {isWin ? '🔥 Ustoppelig sommerflaks' : '🌊 Bølgene tar bare skum, ingen vin'}
      </div>
      <div style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '0.1em', padding: '0.75rem 1.25rem 0' }}>
        {isWin
          ? Array(streak).fill('🍹').join('')
          : <span style={{ color: 'var(--danger)' }}>{Array(streak).fill('🌊').join('')}</span>}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.25rem 1.25rem 0.5rem' }}>
        {isWin
          ? `${streak} trekkinger på rad. Solguden smiler.`
          : `${streak} trekkinger på rad uten en eneste flaske. Sola gjemmer seg.`}
      </div>
      {streaks.map(s => (
        <div key={s.participantId} className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
          <MiniAvatar participant={s} size="lg" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{s.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{s.lotteriesParticipated} totalt deltatt</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MedalBadge({ rank }: { rank: number }) {
  if (rank === 0) return <span style={{ fontSize: '1.1rem' }}>🥇</span>
  if (rank === 1) return <span style={{ fontSize: '1.1rem' }}>🥈</span>
  if (rank === 2) return <span style={{ fontSize: '1.1rem' }}>🥉</span>
  return <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>#{rank + 1}</span>
}

function MiniAvatar({ participant, size }: { participant: { participantId?: number; id?: number; tag: string; hasPhoto: boolean }; size?: string }) {
  const id = participant.participantId ?? participant.id
  const cls = `avatar${size === 'lg' ? ' avatar-lg' : ''}`
  if (!participant.hasPhoto || !id) return null
  return <img src={`/api/participants/${id}/photo`} alt={participant.tag} className={cls} />
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