import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext, useEffect, useState } from 'react'
import api from './api/client'
import type { AppUser } from './types'
import LotteryInfo from './pages/LotteryInfo'
import Statistics from './pages/Statistics'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import AccessDenied from './pages/AccessDenied'

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {}
})

export function useAuth() {
  return useContext(AuthContext)
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const r = await api.get<AppUser>('/api/auth/me')
      setUser(r.data)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

function ProtectedRoute({
  children,
  requiredRole
}: {
  children: React.ReactNode
  requiredRole?: 'ADMIN'
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--wine)' }}>
        <div style={{ color: 'white', fontSize: '2rem' }}>🍷</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><LotteryInfo /></ProtectedRoute>} />
          <Route path="/statistikk" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="ADMIN"><Dashboard /></ProtectedRoute>} />
          <Route path="/ikke-verdig" element={<AccessDenied />} />
          {/* Legacy redirect */}
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
