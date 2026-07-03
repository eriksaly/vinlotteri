import { useEffect, useState, useCallback } from 'react'
import api from '../../api/client'
import type { LotteryInfo } from '../../types'
import NavBar from '../../components/NavBar'
import BuyersTab from './BuyersTab'
import DrawingTab from './DrawingTab'
import InventoryTab from './InventoryTab'
import ParticipantsTab from './ParticipantsTab'
import PrizesTab from './PrizesTab'
import ShoppingTab from './ShoppingTab'
import UsersTab from './UsersTab'

type Tab = 'buyers' | 'drawing' | 'prizes' | 'inventory' | 'participants' | 'shopping' | 'users'

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('buyers')
  const [lottery, setLottery] = useState<LotteryInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const loadLottery = useCallback(() => {
    return api.get<LotteryInfo>('/api/admin/lottery/current')
      .then(r => {
        setLottery(r.data)
        if (r.data.status === 'DRAWING') setTab('drawing')
      })
      .catch(err => {
        if (err.response?.status === 204) setLottery(null)
      })
  }, [])

  useEffect(() => {
    loadLottery().finally(() => setLoading(false))
  }, [loadLottery])

  const [createError, setCreateError] = useState<string | null>(null)

  const createLottery = async () => {
    try {
      const r = await api.post<LotteryInfo>('/api/admin/lottery')
      setLottery(r.data)
    } catch (e: unknown) {
      setCreateError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved opprettelse')
      setTimeout(() => setCreateError(null), 4000)
    }
  }

  return (
    <div className="page">
      <NavBar />
      {createError && (
        <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '0.75rem 1.25rem', borderRadius: 8, fontWeight: 500, fontSize: '0.9rem', background: '#7f1d1d', color: 'white', border: '1px solid #991b1b' }}>
          ⚠️ {createError}
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg, #b8285c 0%, #7d3c98 100%)', color: 'white', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {loading ? <span>Henter parasollen...</span> : lottery ? (
            <>
              <span style={{ fontWeight: 700 }}>{lottery.name}</span>
              <StatusBadge status={lottery.status} />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                🎟️ {lottery.totalTickets} lodd solgt
              </span>
            </>
          ) : (
            <>
              <span style={{ color: 'rgba(255,255,255,0.85)' }}>🏖️ Strandbaren tar sommerferie... ingen aktivt lotteri</span>
              <button className="btn btn-gold btn-sm" onClick={createLottery}>🍹 Åpne strandbaren</button>
            </>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          {lottery?.status === 'DRAWING' ? (
            <>
              <div className="tabs">
                <div className={`tab ${tab === 'drawing' ? 'active' : ''}`} onClick={() => setTab('drawing')}>🎰 Trekningstid!</div>
                <div className={`tab ${tab === 'prizes' ? 'active' : ''}`} onClick={() => setTab('prizes')}>🏆 Premier</div>
              </div>
              {tab === 'prizes' ? (
                <PrizesTab lottery={lottery} />
              ) : (
                <DrawingTab lottery={lottery} onLotteryChange={loadLottery} />
              )}
            </>
          ) : (
            <>
              <div className="tabs">
                <div className={`tab ${tab === 'buyers' ? 'active' : ''}`} onClick={() => setTab('buyers')}>🎟️ Loddkjøpere</div>
                <div className={`tab ${tab === 'drawing' ? 'active' : ''}`} onClick={() => setTab('drawing')}>🎰 Trekningstid!</div>
                <div className={`tab ${tab === 'prizes' ? 'active' : ''}`} onClick={() => setTab('prizes')}>🏆 Premier</div>
                <div className={`tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>🗄️ Lager</div>
                <div className={`tab ${tab === 'participants' ? 'active' : ''}`} onClick={() => setTab('participants')}>👥 Vinfolket</div>
                <div className={`tab ${tab === 'shopping' ? 'active' : ''}`} onClick={() => setTab('shopping')}>🛒 Fyll kjelleren</div>
                <div className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>👑 Kjellerpersonalet</div>
              </div>
              {tab === 'buyers' && <BuyersTab lottery={lottery} onLotteryChange={loadLottery} />}
              {tab === 'drawing' && <DrawingTab lottery={lottery} onLotteryChange={loadLottery} />}
              {tab === 'prizes' && <PrizesTab lottery={lottery} />}
              {tab === 'inventory' && <InventoryTab />}
              {tab === 'participants' && <ParticipantsTab />}
              {tab === 'shopping' && <ShoppingTab />}
              {tab === 'users' && <UsersTab />}
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
