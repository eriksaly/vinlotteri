import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../api/client'
import type { LotteryInfo } from '../../types'
import BuyersTab from './BuyersTab'
import DrawingTab from './DrawingTab'
import ParticipantsTab from './ParticipantsTab'
import ShoppingTab from './ShoppingTab'

type Tab = 'buyers' | 'drawing' | 'participants' | 'shopping'

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
              <button className="btn btn-gold btn-sm" onClick={createLottery}>🍾 Klargjør lotteri</button>
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
                <div className={`tab ${tab === 'shopping' ? 'active' : ''}`} onClick={() => setTab('shopping')}>🛒 Fyll kjelleren</div>
              </div>
              {tab === 'buyers' && <BuyersTab lottery={lottery} onLotteryChange={loadLottery} />}
              {tab === 'drawing' && <DrawingTab lottery={lottery} onLotteryChange={loadLottery} />}
              {tab === 'participants' && <ParticipantsTab />}
              {tab === 'shopping' && <ShoppingTab />}
            </>
          )}
        </div>
      </div>
    </div>
  )
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
