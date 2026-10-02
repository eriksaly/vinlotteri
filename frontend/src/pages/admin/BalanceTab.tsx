import { useEffect, useState } from 'react'
import api from '../../api/client'
import type { CellarBalance } from '../../types'

const kr = (n: number) => `${Math.round(n).toLocaleString('nb-NO')} kr`
const signedKr = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${kr(Math.abs(n))}`
const netColor = (n: number) => n > 0 ? 'var(--success)' : n < 0 ? 'var(--danger)' : 'var(--text-muted)'

export default function BalanceTab() {
  const [balance, setBalance] = useState<CellarBalance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<CellarBalance>('/api/admin/statistics/balance')
      .then(r => setBalance(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Teller kroner i kjelleren...</div>
  if (!balance || balance.totalLotteries === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>Ingen avsluttede lotterier ennå. Regnskapet er blankt.</p>
  }

  return (
    <div>
      <h2 style={{ marginBottom: '0.5rem' }}>🧾 Kjellerregnskapet</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Kun for kjellermestere. Kroner brukt på lodd ({balance.pricePerTicket} kr/stk) mot Vinmonopol-verdien
        på premiene vunnet, over {balance.totalLotteries} avsluttede {balance.totalLotteries === 1 ? 'lotteri' : 'lotterier'}.
      </p>

      {balance.winsWithoutValue > 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
          ⚠️ {balance.winsWithoutValue} {balance.winsWithoutValue === 1 ? 'gevinst mangler' : 'gevinster mangler'} registrert
          premieverdi (trukket før premier ble lagt inn, eller flaskene er slettet fra lageret) og teller som 0 kr.
        </p>
      )}

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr><th>Deltaker</th><th>Lodd</th><th>Brukt</th><th>Gevinster</th><th>Premieverdi</th><th>+/-</th></tr>
            </thead>
            <tbody>
              {balance.participants.map(p => (
                <tr key={p.participantId}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.4rem' }}>{p.tag}</span>
                  </td>
                  <td>{p.ticketsBought}</td>
                  <td>{kr(p.amountSpentNok)}</td>
                  <td>
                    {p.wins > 0 ? `🍾 ${p.wins}` : <span style={{ color: 'var(--text-muted)' }}>–</span>}
                    {p.winsWithoutValue > 0 && (
                      <span title="Gevinster uten registrert premieverdi" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.3rem' }}>
                        ({p.winsWithoutValue} uten verdi)
                      </span>
                    )}
                  </td>
                  <td>{kr(p.prizeValueNok)}</td>
                  <td style={{ fontWeight: 700, color: netColor(p.netNok) }}>{signedKr(p.netNok)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
