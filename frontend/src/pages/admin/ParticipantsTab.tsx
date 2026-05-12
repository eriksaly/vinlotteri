import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../api/client'
import type { Participant } from '../../types'
import { ParticipantAvatar } from './shared'

export default function ParticipantsTab() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [error, setError] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editTag, setEditTag] = useState('')
  const [uploadingId, setUploadingId] = useState<number | null>(null)

  const load = useCallback(() => api.get<Participant[]>('/api/admin/participants').then(r => setParticipants(r.data)), [])
  useEffect(() => { load() }, [load])

  const create = async () => {
    setError('')
    try {
      await api.post('/api/admin/participants', { name: name.trim(), tag: tag.trim() })
      setName(''); setTag('')
      await load()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil')
    }
  }

  const startEdit = (p: Participant) => {
    setEditId(p.id); setEditName(p.name); setEditTag(p.tag)
  }

  const saveEdit = async () => {
    if (!editId) return
    try {
      await api.put(`/api/admin/participants/${editId}`, { name: editName.trim(), tag: editTag.trim() })
      setEditId(null)
      await load()
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil')
    }
  }

  const uploadPhoto = async (participantId: number, file: File) => {
    setUploadingId(participantId)
    const form = new FormData()
    form.append('file', file)
    try {
      await api.post(`/api/admin/participants/${participantId}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await load()
    } catch (e: unknown) {
      alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Feil ved opplasting')
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <div className="card-header">Ny deltaker</div>
        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label>Fullt navn</label>
              <input className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="Ola Nordmann" />
            </div>
            <div className="form-group" style={{ flex: '0 0 120px', marginBottom: 0 }}>
              <label>Tag (forkortelse)</label>
              <input className="form-control" value={tag} onChange={e => setTag(e.target.value.toUpperCase())} placeholder="ON" maxLength={3} />
            </div>
            <button className="btn btn-primary" onClick={create} disabled={!name.trim() || !tag.trim()}>
              Opprett
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Alle deltakere ({participants.length})</div>
        {participants.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            Ingen deltakere ennå. Opprett din første!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>Bilde</th><th>Navn</th><th>Tag</th><th>Handlinger</th></tr>
              </thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id}>
                    <td><ParticipantAvatar participant={p} /></td>
                    <td>
                      {editId === p.id
                        ? <input className="form-control" value={editName} onChange={e => setEditName(e.target.value)} style={{ maxWidth: 200 }} />
                        : <span style={{ fontWeight: 600 }}>{p.name}</span>}
                    </td>
                    <td>
                      {editId === p.id
                        ? <input className="form-control" value={editTag} onChange={e => setEditTag(e.target.value.toUpperCase())} style={{ maxWidth: 70 }} maxLength={3} />
                        : <span className="badge badge-wine">{p.tag}</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {editId === p.id ? (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={saveEdit}>Lagre</button>
                            <button className="btn btn-outline btn-sm" onClick={() => setEditId(null)}>Avbryt</button>
                          </>
                        ) : (
                          <button className="btn btn-outline btn-sm" onClick={() => startEdit(p)}>Rediger</button>
                        )}
                        <PhotoUploadButton
                          participantId={p.id}
                          hasPhoto={p.hasPhoto}
                          uploading={uploadingId === p.id}
                          onUpload={uploadPhoto}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function PhotoUploadButton({ participantId, hasPhoto, uploading, onUpload }: {
  participantId: number
  hasPhoto: boolean
  uploading: boolean
  onUpload: (id: number, file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onUpload(participantId, f)
          e.target.value = ''
        }}
      />
      <button
        className="btn btn-outline btn-sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? '⏳' : hasPhoto ? '📷 Bytt bilde' : '📷 Last opp'}
      </button>
    </>
  )
}
