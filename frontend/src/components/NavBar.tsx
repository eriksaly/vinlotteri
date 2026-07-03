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
        <span className="nav-brand"><span className="palm-sway">🌴</span> Vinlotteri <span className="beach-bob">🍹</span></span>
        <div className="nav-links">
          <Link to="/" className="nav-link">🏖️ Strandbaren</Link>
          <Link to="/statistikk" className="nav-link">🏆 Hall of Rosé</Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin/dashboard" className="btn btn-gold btn-sm">🕶️ Strandsjefen</Link>
          )}
          <button onClick={logout} className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)' }}>👋 Ha det</button>
        </div>
      </div>
    </nav>
  )
}
