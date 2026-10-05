import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

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
