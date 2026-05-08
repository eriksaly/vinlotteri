import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../api/client'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/api/admin/me')
      .then(() => navigate('/admin/dashboard', { replace: true }))
      .catch(() => setChecking(false))
  }, [navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const form = new URLSearchParams()
      form.append('username', username)
      form.append('password', password)
      await api.post('/api/admin/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      navigate('/admin/dashboard')
    } catch {
      setError('Feil passord. Kjelleren forblir låst. 🔒')
    } finally {
      setLoading(false)
    }
  }

  if (checking) return null

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--wine)' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 1rem' }}>
        <div style={{ textAlign: 'center', color: 'white', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🗝️</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Vinsjefen logger inn</h1>
          <p style={{ opacity: 0.75, fontSize: '0.9rem', marginTop: '0.4rem' }}>Bare de med nøkkel til kjelleren slipper inn</p>
        </div>
        <div className="card">
          <div className="card-body">
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Brukernavn</label>
                <input
                  className="form-control"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label>Passord</label>
                <input
                  className="form-control"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                {loading ? '🍷 Sjekker kjellernøkkelen...' : '🗝️ Åpne kjelleren'}
              </button>
            </form>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>← Tilbake til verden for de tørste</Link>
        </div>
      </div>
    </div>
  )
}
