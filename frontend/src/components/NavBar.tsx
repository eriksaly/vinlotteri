import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import api from '../api/client'

export default function NavBar() {
  const { user } = useAuth()

  const logout = async () => {
    await api.post('/api/auth/logout')
    window.location.href = '/login'
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <span className="nav-brand">🍷 Vinlotteri</span>
        <div className="nav-links">
          <Link to="/" className="nav-link">Forside</Link>
          <Link to="/statistikk" className="nav-link">🏆 Hall of Vino</Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin/dashboard" className="btn btn-gold btn-sm">🗝️ Kjellermester</Link>
          )}
          <button onClick={logout} className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}>🚪 Logg ut</button>
        </div>
      </div>
    </nav>
  )
}
