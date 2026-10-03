import { useState, useRef, useEffect, useLayoutEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Participant, InventoryItem } from '../../types'

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="modal">
        <div className="modal-header">{title}</div>
        {children}
      </div>
    </div>
  )
}

export function useConfirm() {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null)
  const confirm = (message: string) => new Promise<boolean>(resolve => setState({ message, resolve }))
  const handleClose = (value: boolean) => { state?.resolve(value); setState(null) }
  const dialog = state ? (
    <Modal title="Er du sikker?" onClose={() => handleClose(false)}>
      <div className="modal-body" style={{ color: 'var(--text-muted)' }}>{state.message}</div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={() => handleClose(false)}>Avbryt</button>
        <button className="btn btn-danger" onClick={() => handleClose(true)}>Ja, fortsett</button>
      </div>
    </Modal>
  ) : null
  return { confirm, dialog }
}

// Participant photos are private: they only render where `showPhoto` is passed
// explicitly (the Vinfolket tab and the winner announcement). Everywhere else
// the participant is shown as a tag-coloured initials badge.
export function ParticipantAvatar({ participant, size, highlight, color, showPhoto }: { participant: Participant; size?: string; highlight?: boolean; color?: string; showPhoto?: boolean }) {
  const cls = `avatar${size === 'xl' ? ' avatar-xl' : size === 'lg' ? ' avatar-lg' : size === 'sm' ? ' avatar-sm' : ''}`
  const inner = showPhoto && participant.hasPhoto
    ? <img src={`/api/participants/${participant.id}/photo`} alt={participant.name} className={cls} />
    : <div className={cls} style={{ background: color ?? tagColor(participant.tag) }}>{participant.tag.toUpperCase()}</div>

  if (highlight !== undefined) {
    return (
      <div style={{
        border: highlight ? '4px solid var(--gold)' : '4px solid transparent',
        borderRadius: '50%',
        boxShadow: highlight ? '0 0 20px rgba(197,160,40,0.6)' : 'none',
        transition: 'all 0.3s',
      }}>
        {inner}
      </div>
    )
  }
  return inner
}

export function ParticipantAutocomplete({
  participants,
  value,
  onChange,
}: {
  participants: Participant[]
  value: string
  onChange: (id: number | '', label: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = value.trim() === ''
    ? participants
    : participants.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase()) ||
        p.tag.toLowerCase().includes(value.toLowerCase())
      )

  useEffect(() => { setHighlighted(0) }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (p: Participant) => {
    onChange(p.id, `${p.name} (${p.tag})`)
    setOpen(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) select(filtered[highlighted]) }
    else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Tab') { if (filtered[highlighted]) select(filtered[highlighted]); setOpen(false) }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        className="form-control"
        placeholder="Søk navn eller tag..."
        value={value}
        onChange={e => { onChange('', e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', zIndex: 100, top: 'calc(100% + 2px)', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={() => select(p)}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.5rem 0.75rem', cursor: 'pointer',
                background: i === highlighted ? 'rgba(114,47,55,0.08)' : 'transparent',
              }}
            >
              <ParticipantAvatar participant={p} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
              <span className="badge badge-wine" style={{ marginLeft: 'auto' }}>{p.tag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Category buckets for the filter chips. Each chip narrows the list to items
// whose category matches any of the bucket's category substrings.
const CATEGORY_CHIPS: { key: string; label: string; categories: string[] }[] = [
  { key: 'beer',     label: '🍺 Øl',         categories: ['øl', 'ale', 'lager', 'porter', 'stout', 'pils', 'hveteøl', 'surøl', 'ipa'] },
  { key: 'red',      label: '🍷 Rødvin',     categories: ['rødvin'] },
  { key: 'white',    label: '🥂 Hvitvin',    categories: ['hvitvin'] },
  { key: 'rose',     label: '🌸 Rosé',       categories: ['rosévin'] },
  { key: 'sparkling',label: '🍾 Bobler',     categories: ['musserende', 'champagne'] },
  { key: 'spirit',   label: '🥃 Sprit',      categories: ['brennevin', 'gin', 'whisky', 'whiskey', 'akevitt', 'druebrennevin', 'rom', 'vodka', 'tequila', 'cognac', 'armagnac', 'likør'] },
]

export function InventoryItemPicker({
  items,
  onSelect,
  disabled,
  placeholder = '+ Legg til flaske',
  width = 240,
}: {
  items: InventoryItem[]
  onSelect: (id: number) => void
  disabled?: boolean
  placeholder?: string
  width?: number
}) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [activeChip, setActiveChip] = useState<string | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const q = value.trim().toLowerCase()
  const chip = activeChip ? CATEGORY_CHIPS.find(c => c.key === activeChip) ?? null : null
  const filtered = items.filter(i => {
    if (chip) {
      const cat = i.category.toLowerCase()
      if (!chip.categories.some(c => cat.includes(c))) return false
    }
    if (q === '') return true
    return (
      i.name.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.country.toLowerCase().includes(q)
    )
  })

  useEffect(() => { setHighlighted(0) }, [value, activeChip])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      if (inputRef.current) setAnchorRect(inputRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  const select = (i: InventoryItem) => {
    onSelect(i.id)
    setValue('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) select(filtered[highlighted]) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
  }

  const DROPDOWN_W = Math.max(width, 300)
  const DROPDOWN_MAX_H = 360
  let dropdownTop = 0
  let dropdownLeft = 0
  let openUpward = false
  if (anchorRect) {
    const spaceBelow = window.innerHeight - anchorRect.bottom
    const spaceAbove = anchorRect.top
    openUpward = spaceBelow < 220 && spaceAbove > spaceBelow
    dropdownTop = openUpward
      ? Math.max(8, anchorRect.top - DROPDOWN_MAX_H - 2)
      : anchorRect.bottom + 2
    // Prefer right-aligning to the input; clamp into viewport
    dropdownLeft = Math.min(
      Math.max(8, anchorRect.right - DROPDOWN_W),
      window.innerWidth - DROPDOWN_W - 8,
    )
  }
  const maxHeightActual = anchorRect
    ? Math.min(DROPDOWN_MAX_H, openUpward ? anchorRect.top - 16 : window.innerHeight - anchorRect.bottom - 16)
    : DROPDOWN_MAX_H

  return (
    <div ref={containerRef} style={{ position: 'relative', width }}>
      <input
        ref={inputRef}
        className="form-control"
        style={{ fontSize: '0.8rem', padding: '0.25rem 0.45rem', width: '100%' }}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={e => { setValue(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        autoComplete="off"
      />
      {open && anchorRect && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed', zIndex: 1000,
            top: dropdownTop, left: dropdownLeft, width: DROPDOWN_W,
            background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)', maxHeight: maxHeightActual,
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div
            onMouseDown={e => e.preventDefault()}
            style={{
              display: 'flex', flexWrap: 'wrap', gap: 4,
              padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border)',
              background: 'var(--bg)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveChip(null)}
              style={chipStyle(activeChip === null)}
            >
              Alle
            </button>
            {CATEGORY_CHIPS.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setActiveChip(activeChip === c.key ? null : c.key)}
                style={chipStyle(activeChip === c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Ingen treff
              </div>
            ) : filtered.map((item, i) => (
              <div
                key={item.id}
                onMouseDown={e => { e.preventDefault(); select(item) }}
                onMouseEnter={() => setHighlighted(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.4rem 0.55rem', cursor: 'pointer', fontSize: '0.85rem',
                  background: i === highlighted ? 'rgba(114,47,55,0.10)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <img
                  src={item.imageUrl}
                  alt=""
                  style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {item.category} · {item.price.toFixed(0)} kr
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

export interface MultiSelectOption {
  value: string
  label: string
  count?: number
}

// A dropdown for picking several values, with a box at the top for narrowing the list.
// `placeholder` is shown when nothing is picked, e.g. "Alle land".
export function MultiSelect({
  placeholder,
  options,
  selected,
  onChange,
  minWidth = 180,
}: {
  placeholder: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  minWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Values picked earlier that aren't among the options any more stay listed, so they can be unticked
  const allOptions = [
    ...options,
    ...selected.filter(v => !options.some(o => o.value === v)).map(v => ({ value: v, label: v, count: 0 })),
  ]
  const q = filter.trim().toLowerCase()
  const shown = q ? allOptions.filter(o => o.label.toLowerCase().includes(q)) : allOptions

  useEffect(() => { setHighlighted(0) }, [filter, open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || dropdownRef.current?.contains(target)) return
      setOpen(false)
      setFilter('')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // The list is rendered into <body> because cards clip their overflow, so it follows the button
  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      if (buttonRef.current) setAnchorRect(buttonRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])

  const close = () => {
    setOpen(false)
    setFilter('')
    buttonRef.current?.focus()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(i => Math.min(i + 1, shown.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[highlighted]) toggle(shown[highlighted].value) }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
  }

  const labels = selected.map(v => allOptions.find(o => o.value === v)?.label ?? v)
  const summary = labels.length === 0 ? placeholder : labels.length === 1 ? labels[0] : `${labels[0]} +${labels.length - 1}`

  const dropdownWidth = Math.max(anchorRect?.width ?? 0, 260)
  const maxHeight = anchorRect ? Math.min(360, window.innerHeight - anchorRect.bottom - 16) : 360

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="form-control"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        style={{
          width: 'auto', minWidth, maxWidth: 320,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
          background: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
        <span aria-hidden style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>▾</span>
      </button>
      {open && anchorRect && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed', zIndex: 1000,
            top: anchorRect.bottom + 2,
            left: Math.min(anchorRect.left, window.innerWidth - dropdownWidth - 8),
            width: dropdownWidth, maxHeight,
            background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              className="form-control"
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem' }}
              placeholder="Filtrer..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              onKeyDown={handleKey}
              autoComplete="off"
            />
            {selected.length > 0 && (
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => onChange([])}
                style={{ background: 'none', border: 'none', color: 'var(--wine)', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Nullstill
              </button>
            )}
          </div>
          <div role="listbox" aria-multiselectable="true" style={{ overflowY: 'auto', flex: 1 }}>
            {shown.length === 0 ? (
              <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ingen treff</div>
            ) : shown.map((o, i) => {
              const checked = selected.includes(o.value)
              return (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={checked}
                  // mousedown keeps the focus in the filter box
                  onMouseDown={e => { e.preventDefault(); toggle(o.value) }}
                  onMouseEnter={() => setHighlighted(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.35rem 0.65rem', cursor: 'pointer', fontSize: '0.88rem',
                    background: i === highlighted ? 'rgba(114,47,55,0.10)' : 'transparent',
                  }}
                >
                  <input type="checkbox" checked={checked} readOnly tabIndex={-1} style={{ pointerEvents: 'none' }} />
                  <span style={{ flex: 1 }}>{o.label}</span>
                  {o.count != null && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{o.count}</span>}
                </div>
              )
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: '0.72rem', fontWeight: 500,
    padding: '0.18rem 0.55rem', borderRadius: 999,
    border: `1px solid ${active ? 'var(--wine)' : 'var(--border)'}`,
    background: active ? 'var(--wine)' : 'var(--bg-card)',
    color: active ? 'white' : 'var(--text)',
    cursor: 'pointer', whiteSpace: 'nowrap',
    lineHeight: 1.4,
  }
}

export function ImageLightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', cursor: 'zoom-out',
      }}
    >
      <img
        src={src}
        alt={alt ?? ''}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)', background: 'white', borderRadius: 8,
          cursor: 'default',
        }}
      />
      <button
        onClick={onClose}
        aria-label="Lukk"
        style={{
          position: 'absolute', top: 16, right: 16,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', color: 'white',
          border: 'none', cursor: 'pointer', fontSize: '1.3rem',
        }}
      >
        ✕
      </button>
    </div>
  )
}

export function tagColor(tag: string) {
  const colors = ['#b32020', '#c86a10', '#a08a00', '#1e7a38', '#1a4db0', '#6b1a80']
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
