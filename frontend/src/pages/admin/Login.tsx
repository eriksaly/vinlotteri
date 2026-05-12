import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../App'

export default function Login() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (!loading && user) {
      navigate(user.role === 'ADMIN' ? '/admin/dashboard' : '/', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading) return null

  const errorMessage = error === 'auth'
    ? 'Noe gikk galt under innlogging. Prøv igjen. 🤷'
    : null

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--wine)' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 1rem' }}>
        <div style={{ textAlign: 'center', color: 'white', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🗝️</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Velkommen til kjelleren</h1>
          <p style={{ opacity: 0.75, fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Kun verdige isys-ansatte slipper inn
          </p>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            {errorMessage && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {errorMessage}
              </div>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Logg inn med din isys.no Google-konto for å få adgang til kjelleren.
            </p>
            <a
              href="/oauth2/authorization/google"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center', textDecoration: 'none' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Logg inn med Google
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
