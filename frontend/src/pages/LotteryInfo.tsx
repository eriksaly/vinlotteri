import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { LotteryInfo } from '../types'
import NavBar from '../components/NavBar'

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
      <NavBar />

      <div className="page-header">
        <div className="container">
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem', position: 'relative' }}>
            <span className="palm-sway">🌴</span>
            <span className="beach-bob" style={{ margin: '0 0.4rem' }}>🍹</span>
            <span className="palm-sway" style={{ animationDelay: '0.6s' }}>🌴</span>
          </div>
          <h1 className="page-title">Vinlotteri — Sommerutgave</h1>
          <p className="page-subtitle">Sol, sjøbris og sjanser. Fem kroner mellom deg og en flaske rosé på balkongen. 🌅</p>
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" />
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Sjekker om strandbaren er åpen... 🏖️</p>
            </div>
          ) : lottery && lottery.status === 'OPEN' ? (
            <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card">
                <div className="card-header" style={{ background: 'var(--sunset-gradient)', color: 'white' }}>
                  🌅 To enkle steg til en flaske ved bassenget
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ fontSize: '2.2rem', flexShrink: 0 }}>1️⃣</div>
                    <div>
                      <strong>Send Vipps til strandsjefen</strong><br />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {lottery.pricePerTicket} kr per lodd til <a href={`vipps://?phone=${lottery.vippsNumber}`} style={{ color: 'var(--wine)', fontWeight: 700 }}>{lottery.vippsNumber}</a>. Billigere enn en drink på taket. Litt mindre garantert fest.
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ fontSize: '2.2rem', flexShrink: 0 }}>2️⃣</div>
                    <div>
                      <strong>Legg deg på solsenga og vent 🌞</strong><br />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Loddene registreres av strandsjefen. Du gjør ingenting. Bare skåle med skyggen.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body" style={{ textAlign: 'center' }}>
                  <VippsButton number={lottery.vippsNumber} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    {lottery.pricePerTicket} kr per lodd
                  </div>
                  <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-green">🏖️ Strandbaren er åpen</span>
                    <span className="badge badge-wine">🎟️ {lottery.totalTickets} lodd solgt</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Odds øker med antall lodd. Solbriller anbefales. Rakettforskning nødvendig? Nei. Rosé? Ja. 🕶️🌊
              </div>
            </div>
          ) : lottery && lottery.status === 'DRAWING' ? (
            <div style={{ maxWidth: 520, margin: '0 auto' }}>
              <div className="card">
                <div className="card-body" style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><span className="beach-bob">🎰</span></div>
                  <h2 style={{ color: 'var(--wine)', marginBottom: '0.5rem' }}>Trekning pågår ved bassengkanten!</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Strandbaren tar en kort pause. Ingen nye lodd slippes til solsengene.
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Finn strandsjefen — trekningen skjer live med paraply-glass i hånda! 🍹
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 520, margin: '0 auto' }}>
              <div className="card">
                <div className="card-body" style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><span className="beach-bob">🏝️</span></div>
                  <h2 style={{ marginBottom: '0.5rem' }}>Strandbaren tar sommerferie</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Ingen aktive lotterier akkurat nå. Strandsjefen ligger utstrakt et sted med bedre WiFi enn ambisjoner. Kom tilbake når parasollen slås opp igjen!
                  </p>
                  <Link to="/statistikk">
                    <button className="btn btn-outline">🏆 Se Hall of Rosé</button>
                  </Link>
                </div>
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

function VippsButton({ number }: { number: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(number).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
      <button
        onClick={copy}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'linear-gradient(135deg, #FF7A59 0%, #FF5B24 100%)', color: 'white', border: 'none', cursor: 'pointer',
          padding: '0.8rem 1.8rem', borderRadius: '999px',
          fontWeight: 700, fontSize: '1.2rem',
          boxShadow: '0 6px 20px rgba(255,91,36,0.45)',
          transition: 'transform 0.15s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,91,36,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,91,36,0.45)'; }}
      >
        {copied ? '✓ Kopiert!' : `📱 Kopier Vipps-nummer`}
      </button>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {copied ? `${number} er kopiert — lim inn i Vipps` : `Trykk for å kopiere ${number}`}
      </span>
    </div>
  )
}
