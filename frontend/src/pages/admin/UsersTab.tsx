import { useEffect, useState } from 'react'
import api from '../../api/client'
import type { UserDto } from '../../types'
import { useAuth } from '../../App'

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '🍾 Kjellermester',
  USER: '🍷 Vinelsker'
}

export default function UsersTab() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<UserDto[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.get<UserDto[]>('/api/admin/users')
      .then(r => setUsers(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const updateRole = async (id: number, role: 'ADMIN' | 'USER') => {
    await api.put(`/api/admin/users/${id}/role`, { role })
    load()
  }

  const deleteUser = async (id: number, name: string) => {
    if (!confirm(`Vise ${name} på dør? De mister all tilgang til kjelleren.`)) return
    await api.delete(`/api/admin/users/${id}`)
    load()
  }

  if (loading) return <div className="loading">Henter kjellerpersonalet...</div>

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Kjellerpersonalet</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Administrer hvem som har tilgang til kjelleren og hvilken rang de har.
        <strong> Kjellermester</strong> styrer lotteriet. <strong>Vinelsker</strong> kan bare se på.
      </p>
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Navn</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>E-post</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Rang</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Siste besøk</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isMe = u.email === me?.email
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: isMe ? 'var(--bg)' : undefined }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {u.name} {isMe && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(deg)</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: u.role === 'ADMIN' ? 'var(--wine)' : 'var(--bg)',
                        color: u.role === 'ADMIN' ? 'white' : 'var(--text)'
                      }}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' }) : '–'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {!isMe && u.role === 'USER' && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => updateRole(u.id, 'ADMIN')}
                            title="Gi kjellernøkkel"
                          >
                            🗝️ Gi nøkkel
                          </button>
                        )}
                        {!isMe && u.role === 'ADMIN' && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => updateRole(u.id, 'USER')}
                            title="Ta nøkkelen tilbake"
                          >
                            🔒 Ta nøkkel
                          </button>
                        )}
                        {!isMe && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => deleteUser(u.id, u.name)}
                            title="Vis på dør"
                          >
                            🚪 På dør
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {users.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Ingen brukere funnet i kjellerboken.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
