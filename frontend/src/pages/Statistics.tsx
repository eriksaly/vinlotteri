import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { AllTimeStatistics, Streak } from '../types'

export default function StatisticsPage() {
  const [stats, setStats] = useState<AllTimeStatistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<AllTimeStatistics>('/api/statistics')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-brand">🍷 Vinlotteri</span>
          <div className="nav-links">
            <Link to="/" className="nav-link">Hjem</Link>
            <Link to="/admin/login" className="nav-link">🗝️ Vinsjef</Link>
          </div>
        </div>
      </nav>

      <div className="page-header">
        <div className="container">
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🏆</div>
          <h1 className="page-title">Hall of Vino</h1>
          <p className="page-subtitle">Hvem har drukket mest på bedriftens regning? Her er fasiten.</p>
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
                <StatCard emoji="🎟️" label="Lodd kjøpt totalt" value={stats.topTicketBuyers.reduce((s, p) => s + p.totalTicketsBought, 0).toString()} />
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
                          <tr><th>#</th><th>Navn</th><th>Vinnersjanser brukt</th></tr>
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
                                    {i === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--gold)' }}>👑 Gjeldende vinkjær</div>}
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
                          <tr><th>#</th><th>Navn</th><th>Livets urettferdighet</th></tr>
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
                                  <div>
                                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                                  </div>
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
              {(stats.longestWinStreak || stats.longestLoseStreak) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {stats.longestWinStreak && <StreakCard streak={stats.longestWinStreak} type="win" />}
                  {stats.longestLoseStreak && <StreakCard streak={stats.longestLoseStreak} type="lose" />}
                </div>
              )}

              <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                🍷 Ingen viner ble skadet i produksjonen av denne statistikken 🍷
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StreakCard({ streak, type }: { streak: Streak; type: 'win' | 'lose' }) {
  const isWin = type === 'win'
  return (
    <div className="card">
      <div className="card-header" style={{ background: isWin ? 'var(--wine)' : '#4a4a5a', color: 'white' }}>
        {isWin ? '🔥 Ustoppelig vinmaskin' : '🌧️ Kjellerdøra nekter å åpne seg'}
      </div>
      <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <MiniAvatar participant={streak} size="lg" />
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{streak.name}</div>
          <div style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '0.1em' }}>
            {isWin
              ? Array(streak.streak).fill('🍷').join('')
              : <span style={{ color: 'var(--danger)' }}>{Array(streak.streak).fill('✕').join('')}</span>}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {isWin
              ? `${streak.streak} trekkinger på rad. Flaks eller verdig?`
              : `${streak.streak} trekkinger på rad uten en eneste flaske.`}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
            {streak.lotteriesParticipated} totalt deltatt
          </div>
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

function MiniAvatar({ participant, size }: { participant: { participantId?: number; id?: number; tag: string; hasPhoto: boolean }; size?: string }) {
  const id = participant.participantId ?? participant.id
  const cls = `avatar${size === 'lg' ? ' avatar-lg' : ''}`
  if (participant.hasPhoto && id) {
    return <img src={`/api/participants/${id}/photo`} alt={participant.tag} className={cls} />
  }
  return (
    <div className={cls} style={{ background: tagColor(participant.tag) }}>
      {participant.tag.toUpperCase()}
    </div>
  )
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

function tagColor(tag: string) {
  const colors = ['#722F37', '#2d4a7a', '#2d7a5a', '#7a4a2d', '#5a2d7a', '#7a2d6a']
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
