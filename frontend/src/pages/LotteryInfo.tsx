import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { LotteryInfo } from '../types'

export default function LotteryInfoPage() {
  const [lottery, setLottery] = useState<LotteryInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<LotteryInfo>('/api/lottery/current')
      .then(r => setLottery(r.data))
      .catch(() => setLottery(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-brand">🍷 Vinlotteri</span>
          <div className="nav-links">
            <Link to="/statistikk" className="nav-link">🏆 Hall of Vino</Link>
            <Link to="/admin/login" className="nav-link">🗝️ Vinsjef</Link>
          </div>
        </div>
      </nav>

      <div className="page-header">
        <div className="container">
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🍷</div>
          <h1 className="page-title">Kontor-vinlotteri</h1>
          <p className="page-subtitle">Fem kroner kan forandre alt. Eller ingenting. Men det er verdt forsøket.</p>
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" />
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Sjekker om kjelleren er åpen...</p>
            </div>
          ) : lottery && lottery.status === 'OPEN' ? (
            <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card">
                <div className="card-header" style={{ background: 'var(--wine)', color: 'white' }}>
                  🎯 Tre enkle steg til potensielt vin
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ fontSize: '2.2rem', flexShrink: 0 }}>1️⃣</div>
                    <div>
                      <strong>Send Vipps til vinsjefen</strong><br />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {lottery.pricePerTicket} kr per lodd til <strong style={{ color: 'var(--wine)' }}>#{lottery.vippsNumber}</strong>. Billigere enn en kopp kaffe. Mye morsommere.
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ fontSize: '2.2rem', flexShrink: 0 }}>2️⃣</div>
                    <div>
                      <strong>Skriv navn og antall lodd i melding</strong><br />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        F.eks. <em>«Erik – 3 lodd»</em>. Uten navn havner pengene i kjelleren for alltid.
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ fontSize: '2.2rem', flexShrink: 0 }}>3️⃣</div>
                    <div>
                      <strong>Vent spent på trekning!</strong><br />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Loddene registreres av vinsjefen. Du gjør ingenting. Bare håpe.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Vipps-nummer
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--wine)' }}>
                    #{lottery.vippsNumber}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                    {lottery.pricePerTicket} kr per lodd
                  </div>
                  <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-green">🟢 Lotteri åpent</span>
                    <span className="badge badge-wine">🎟️ {lottery.totalTickets} lodd solgt</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Odds øker med antall lodd. Det er ikke rakettforskning — men det er vinvitenskap. 🔬🍷
              </div>
            </div>
          ) : lottery && lottery.status === 'DRAWING' ? (
            <div style={{ maxWidth: 520, margin: '0 auto' }}>
              <div className="card">
                <div className="card-body" style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎰</div>
                  <h2 style={{ color: 'var(--wine)', marginBottom: '0.5rem' }}>Trekning pågår akkurat nå!</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Kjellerdøra er låst. Ingen nye lodd slippes inn.
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Finn vinsjefen — trekningen skjer live! 🍾
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 520, margin: '0 auto' }}>
              <div className="card">
                <div className="card-body" style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😴</div>
                  <h2 style={{ marginBottom: '0.5rem' }}>Kjelleren er stengt</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Ingen aktiv lotteri akkurat nå. Vinsjefen hviler. Kom tilbake når kjellerdøra åpner!
                  </p>
                  <Link to="/statistikk">
                    <button className="btn btn-outline">🏆 Se Hall of Vino</button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
