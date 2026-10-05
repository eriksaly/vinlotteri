import { useState, useEffect, useCallback, useMemo, useDeferredValue, useRef, memo, Fragment } from 'react'
import { useNavigationType, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import type { WineProduct, WineReview, WineReviewSyncResult } from '../types'
import { useAuth } from '../App'
import NavBar from '../components/NavBar'
import { MultiSelect, type MultiSelectOption } from '../components/MultiSelect'

type SortKey = 'name' | 'country' | 'region' | 'volume' | 'price' | 'pricePerScore' | 'stock' | 'score'
type SortDir = 'asc' | 'desc'

const SORT_VALUE: Record<SortKey, (p: WineProduct) => string | number | null> = {
  name: p => p.productShortName,
  country: p => p.country,
  region: p => p.regionDetailed,
  volume: p => p.volume,
  price: p => p.price,
  pricePerScore: p => p.pricePerScore,
  stock: p => p.inStock == null ? null : p.inStock ? p.hortenStock ?? 1 : 0,
  score: p => p.score,
}

// Text A–Z, smallest, cheapest and best value first; stock and rating highest first
const DEFAULT_DIR: Record<SortKey, SortDir> = {
  name: 'asc', country: 'asc', region: 'asc', volume: 'asc', price: 'asc', pricePerScore: 'asc', stock: 'desc', score: 'desc',
}

// Created once: toLocaleString with options builds a new formatter on every call, which adds up
// over ~950 rows on every render
const centilitres = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })
const litresFormat = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })
const twoDecimals = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateTime = new Intl.DateTimeFormat('nb-NO', { dateStyle: 'short', timeStyle: 'short' })

// 0.75 → "75 cl", 1.5 → "1,5 l"
function formatVolume(litres: number) {
  return litres < 1 ? `${centilitres.format(litres * 100)} cl` : `${litresFormat.format(litres)} l`
}

// hasOwnProperty rather than `in`, which also accepts inherited keys like "constructor"
const isSortKey = (key: string | null): key is SortKey =>
  key != null && Object.prototype.hasOwnProperty.call(SORT_VALUE, key)

interface Filters {
  types: string[]
  q: string
  maxPrice: string
  inStockOnly: boolean
  countries: string[]
  regions: string[]
  // Litres as strings, e.g. "0.75"
  volumes: string[]
  // Searched for in the review texts, on the server
  text: string
  sort: { key: SortKey; dir: SortDir }
}

function filtersFromQuery(params: URLSearchParams): Filters {
  const key = params.get('sort')
  const dir = params.get('dir')
  return {
    types: params.getAll('type').filter(Boolean),
    q: params.get('q') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    inStockOnly: params.get('inStock') !== '0',
    countries: params.getAll('country').filter(Boolean),
    regions: params.getAll('region').filter(Boolean),
    volumes: params.getAll('volume').filter(Boolean),
    text: params.get('text') ?? '',
    sort: isSortKey(key)
      ? { key, dir: dir === 'asc' || dir === 'desc' ? dir : DEFAULT_DIR[key] }
      : { key: 'score', dir: 'desc' },
  }
}

// Defaults are left out to keep the URL short. Multi-value filters repeat the parameter
// (type=Rødvin&type=Hvitvin), since values can contain commas.
function filtersToQuery(f: Filters): string {
  const params = new URLSearchParams()
  f.types.forEach(v => params.append('type', v))
  if (f.q) params.set('q', f.q)
  if (f.maxPrice) params.set('maxPrice', f.maxPrice)
  if (!f.inStockOnly) params.set('inStock', '0')
  f.countries.forEach(v => params.append('country', v))
  f.regions.forEach(v => params.append('region', v))
  f.volumes.forEach(v => params.append('volume', v))
  if (f.text) params.set('text', f.text)
  if (f.sort.key !== 'score' || f.sort.dir !== 'desc') {
    params.set('sort', f.sort.key)
    params.set('dir', f.sort.dir)
  }
  return params.toString()
}

// Dropdown options: each distinct value with how many products have it
function countBy(products: WineProduct[], value: (p: WineProduct) => string | null): MultiSelectOption[] {
  const counts = new Map<string, number>()
  products.forEach(p => {
    const v = value(p)
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
  })
  return [...counts.entries()].map(([v, count]) => ({ value: v, label: v, count }))
}

export default function WineReviews() {
  return (
    <div className="page">
      <NavBar />

      <div className="page-header">
        <div className="container">
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>⭐</div>
          <h1 className="page-title">VG-anmeldelser</h1>
          <p className="page-subtitle">Terningkast fra VG, med lagerstatus fra Vinmonopolet i Horten.</p>
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          <WineReviewList />
        </div>
      </div>
    </div>
  )
}

function WineReviewList() {
  // Syncing from VG is admin-only
  const isAdmin = useAuth().user?.role === 'ADMIN'
  // Filters and sorting are kept in the query string so a reload keeps them. The inputs work on local
  // state, which is mirrored into the URL, rather than reading the URL directly.
  const [params, setParams] = useSearchParams()
  const query = params.toString()
  const navigationType = useNavigationType()
  const [filters, setFilters] = useState(() => filtersFromQuery(params))
  const { types, q: search, maxPrice, inStockOnly, countries, regions, volumes, text, sort } = filters
  const updateFilters = (changes: Partial<Filters>) => setFilters(f => ({ ...f, ...changes }))
  const [products, setProducts] = useState<WineProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Record<string, WineReview[]>>({})
  const [syncing, setSyncing] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const load = useCallback(async () => {
    try {
      const r = await api.get<WineProduct[]>('/api/wine-reviews/products')
      setProducts(r.data)
      setLoadFailed(false)
    } catch {
      setLoadFailed(true)
      setToast({ msg: 'Kunne ikke hente vinanmeldelsene', ok: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Filters → URL. replace: filter changes don't add history entries.
  useEffect(() => {
    const next = filtersToQuery(filters)
    if (next !== query) setParams(next, { replace: true })
    // setParams and query are left out: this should only run when the filters change
  }, [filters])

  // URL → filters, when the URL is changed from outside (Back/Forward, a link). Our own updates above are
  // REPLACE navigations and skipped, so a URL update that lands late can't undo newer typing.
  useEffect(() => {
    if (navigationType === 'REPLACE') return
    const fromUrl = filtersFromQuery(new URLSearchParams(query))
    if (filtersToQuery(fromUrl) !== filtersToQuery(filters)) setFilters(fromUrl)
  }, [query])

  const byLabel = (a: MultiSelectOption, b: MultiSelectOption) => a.label.localeCompare(b.label, 'nb')
  const typeOptions = useMemo(() => countBy(products, p => p.subProductTypeName).sort((a, b) => b.count! - a.count!), [products])
  const countryOptions = useMemo(() => countBy(products, p => p.country).sort(byLabel), [products])
  // Region names repeat across countries ("Øvrige"), so only list the chosen countries' regions
  const inCountries = (p: WineProduct) => countries.length === 0 || (p.country != null && countries.includes(p.country))
  const regionOptions = useMemo(
    () => countBy(products.filter(inCountries), p => p.regionDetailed).sort(byLabel),
    [products, countries],
  )
  const volumeOptions = useMemo(
    () => countBy(products, p => p.volume != null ? String(p.volume) : null)
      .map(o => ({ ...o, label: formatVolume(Number(o.value)) }))
      .sort((a, b) => Number(a.value) - Number(b.value)),
    [products],
  )

  const changeCountries = (next: string[]) => {
    // Keep only the regions the new countries have
    const kept = regions.filter(r => products.some(p =>
      (next.length === 0 || (p.country != null && next.includes(p.country))) && p.regionDetailed === r))
    updateFilters({ countries: next, regions: kept })
  }

  // The product list doesn't include the review texts, so the text search runs on the server and returns
  // the matching product ids. Waits for a pause in typing, and ignores replies to an older search.
  const textQuery = text.trim()
  const [textMatches, setTextMatches] = useState<{ text: string; ids: Set<string> } | null>(null)
  useEffect(() => {
    if (textQuery.length < 2) { setTextMatches(null); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const r = await api.get<string[]>('/api/wine-reviews/search', { params: { text: textQuery } })
        if (!cancelled) setTextMatches({ text: textQuery, ids: new Set(r.data) })
      } catch {
        if (!cancelled) setToast({ msg: 'Søket i anmeldelsene feilet', ok: false })
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [textQuery])
  const textSearching = textQuery.length >= 2 && textMatches?.text !== textQuery

  // The list is rendered from a deferred copy of the filters, so typing in a filter box stays responsive:
  // the input updates first and React renders the list in the background
  const deferred = useDeferredValue(filters)
  const deferredTextActive = deferred.text.trim().length >= 2
  const visible = useMemo(() => {
    const { types, q: search, maxPrice, inStockOnly, countries, regions, volumes, sort } = deferred
    const inCountries = (p: WineProduct) => countries.length === 0 || (p.country != null && countries.includes(p.country))
    const q = search.trim().toLowerCase()
    const max = maxPrice === '' ? null : Number(maxPrice)
    const getValue = SORT_VALUE[sort.key]
    const factor = sort.dir === 'asc' ? 1 : -1
    return products
      .filter(p => types.length === 0 || (p.subProductTypeName != null && types.includes(p.subProductTypeName)))
      .filter(p => !q || (p.productShortName ?? '').toLowerCase().includes(q) || p.productId.includes(q))
      .filter(p => max == null || (p.price != null && p.price <= max))
      .filter(p => !inStockOnly || p.inStock === true)
      .filter(inCountries)
      .filter(p => regions.length === 0 || (p.regionDetailed != null && regions.includes(p.regionDetailed)))
      .filter(p => volumes.length === 0 || (p.volume != null && volumes.includes(String(p.volume))))
      // Until the first reply arrives the text filter isn't applied; after that the latest reply is used
      .filter(p => !deferredTextActive || !textMatches || textMatches.ids.has(p.productId))
      .sort((a, b) => {
        const va = getValue(a)
        const vb = getValue(b)
        // Missing values go last regardless of direction
        if (va == null || vb == null) {
          if (va != null) return -1
          if (vb != null) return 1
        } else if (va !== vb) {
          return factor * (typeof va === 'number' ? va - (vb as number) : va.localeCompare(vb as string, 'nb'))
        }
        return b.score - a.score || b.grade - a.grade || (a.productShortName ?? '').localeCompare(b.productShortName ?? '', 'nb')
      })
  }, [products, deferred, deferredTextActive, textMatches])

  const toggleSort = (key: SortKey) => {
    updateFilters({ sort: sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: DEFAULT_DIR[key] } })
  }

  // Rows are memoized, so they get a toggle function that never changes and calls the latest version
  const toggleExpandRef = useRef<(productId: string) => void>(() => {})
  const onToggleExpand = useCallback((productId: string) => toggleExpandRef.current(productId), [])
  const toggleExpand = async (productId: string) => {
    if (expandedId === productId) { setExpandedId(null); return }
    setExpandedId(productId)
    if (reviews[productId]) return
    try {
      const r = await api.get<WineReview[]>(`/api/wine-reviews/products/${encodeURIComponent(productId)}/reviews`)
      setReviews(m => ({ ...m, [productId]: r.data }))
    } catch {
      setToast({ msg: 'Kunne ikke hente anmeldelsene', ok: false })
      // Only collapse if this row is still the open one
      setExpandedId(id => id === productId ? null : id)
    }
  }
  toggleExpandRef.current = toggleExpand

  const sync = async () => {
    setSyncing(true)
    try {
      const r = await api.post<WineReviewSyncResult>('/api/admin/wine-reviews/sync')
      const { newReviews, updatedReviews } = r.data
      setToast({
        msg: newReviews === 0 && updatedReviews === 0
          ? 'Ingen nye anmeldelser fra VG'
          : `${newReviews} nye og ${updatedReviews} oppdaterte anmeldelser hentet`,
        ok: true,
      })
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      setToast({ msg: status === 409 ? 'Synkronisering pågår allerede' : 'Synkronisering mot VG feilet', ok: false })
      return
    } finally {
      setSyncing(false)
    }
    setExpandedId(null)
    setReviews({})
    // Reports its own errors, separately from the sync
    await load()
  }

  if (loading) return <div className="card"><div className="card-body">Henter vinanmeldelser...</div></div>

  const reviewTotal = products.reduce((sum, p) => sum + p.reviewCount, 0)
  const sortHeader = (k: SortKey, label: string, align?: 'right', title?: string) => (
    <th
      title={title}
      onClick={() => toggleSort(k)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', textAlign: align, color: sort.key === k ? 'var(--wine)' : undefined }}
    >
      {label} {sort.key === k ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
    </th>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {toast && (
        <div style={{
          padding: '0.75rem 1.25rem', borderRadius: 8, fontWeight: 500, fontSize: '0.9rem',
          background: toast.ok ? '#166534' : '#7f1d1d',
          color: 'white', border: `1px solid ${toast.ok ? '#15803d' : '#991b1b'}`,
        }}>
          {toast.ok ? '✓' : '⚠️'} {toast.msg}
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div>{products.length} produkter · {reviewTotal} anmeldelser</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Hentes fra VG hver natt. Vurderingen gjelder sist anmeldte årgang.
            </div>
          </div>
          {isAdmin && (
            <button className="btn btn-outline btn-sm" onClick={sync} disabled={syncing}>
              {syncing ? '⏳ Henter...' : '🔄 Hent nye'}
            </button>
          )}
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <MultiSelect
              placeholder={`Alle typer (${products.length})`}
              options={typeOptions}
              selected={types}
              onChange={next => updateFilters({ types: next })}
              minWidth={220}
            />
            <input
              className="form-control"
              style={{ width: 240 }}
              placeholder="Søk navn eller varenr..."
              value={search}
              onChange={e => updateFilters({ q: e.target.value })}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Maks pris
              <input
                className="form-control"
                style={{ width: 110 }}
                type="number"
                min={0}
                step={25}
                placeholder="Alle"
                value={maxPrice}
                onChange={e => updateFilters({ maxPrice: e.target.value })}
              />
              kr
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={inStockOnly} onChange={e => updateFilters({ inStockOnly: e.target.checked })} />
              Kun på lager i Horten
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <MultiSelect placeholder="Alle land" options={countryOptions} selected={countries} onChange={changeCountries} />
            <MultiSelect
              placeholder="Alle regioner"
              options={regionOptions}
              selected={regions}
              onChange={next => updateFilters({ regions: next })}
            />
            <MultiSelect
              placeholder="Alle størrelser"
              options={volumeOptions}
              selected={volumes}
              onChange={next => updateFilters({ volumes: next })}
              minWidth={150}
            />
            <input
              className="form-control"
              style={{ width: 280 }}
              placeholder="Søk i anmeldelsene..."
              value={text}
              onChange={e => updateFilters({ text: e.target.value })}
            />
            {textSearching && (
              <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Søker...</span>
            )}
            {(types.length > 0 || search || maxPrice || inStockOnly || countries.length > 0 || regions.length > 0
              || volumes.length > 0 || textQuery.length >= 2) && (
              <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{visible.length} treff</span>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            {loadFailed
              ? 'Kunne ikke hente vinanmeldelsene. Prøv å laste siden på nytt.'
              : isAdmin
                ? 'Ingen anmeldelser hentet ennå. Trykk «Hent nye» for å hente fra VG.'
                : 'Ingen anmeldelser hentet ennå.'}
          </div>
        ) : visible.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Ingen treff.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}></th>
                  {sortHeader('name', 'Navn')}
                  {sortHeader('country', 'Land')}
                  {sortHeader('region', 'Region')}
                  {sortHeader('volume', 'Volum', 'right')}
                  {sortHeader('price', 'Pris', 'right')}
                  {sortHeader('pricePerScore', 'Pris/poeng', 'right', 'Literpris delt på poeng. Lavere er bedre kjøp.')}
                  {sortHeader('stock', 'Horten', 'right')}
                  {sortHeader('score', 'Vurdering', 'right')}
                </tr>
              </thead>
              <tbody>
                {visible.map(p => (
                  <ProductRow
                    key={p.productId}
                    p={p}
                    expanded={expandedId === p.productId}
                    reviews={reviews[p.productId]}
                    onToggle={onToggleExpand}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Memoized so a filter change only re-renders the rows whose data changed
const ProductRow = memo(function ProductRow({ p, expanded, reviews, onToggle }: {
  p: WineProduct
  expanded: boolean
  reviews: WineReview[] | undefined
  onToggle: (productId: string) => void
}) {
  return (
    <Fragment>
      <tr onClick={() => onToggle(p.productId)} style={{ cursor: 'pointer' }}>
        <td>
          <img
            src={p.imageUrl}
            alt=""
            loading="lazy"
            style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }}
            onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
          />
        </td>
        <td>
          <div style={{ fontWeight: 500 }}>{p.productShortName ?? 'Ukjent navn'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <a href={p.vinmonopoletUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>#{p.productId}</a>
            {p.productTypeName && ` · ${p.productTypeName}`}
            <Vintages current={p.vmpVintage} reviewed={p.vintage} />
          </div>
        </td>
        <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.country || '—'}</td>
        <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.regionDetailed || '—'}</td>
        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.volume != null ? formatVolume(p.volume) : '—'}</td>
        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{p.price != null ? `${p.price.toFixed(2)} kr` : '—'}</td>
        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {p.pricePerScore != null ? twoDecimals.format(p.pricePerScore) : '—'}
        </td>
        <td
          style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
          title={p.stockCheckedAt
            ? `Sjekket ${dateTime.format(new Date(p.stockCheckedAt))}`
            : 'Ikke sjekket ennå'}
        >
          {p.inStock == null ? (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          ) : p.inStock ? (
            <span className="badge badge-green">{p.hortenStock != null ? `${p.hortenStock} stk` : 'På lager'}</span>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ikke på lager</span>
          )}
        </td>
        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{p.score}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> p</span>
          <Terningkast grade={p.grade} size={28} style={{ marginLeft: '0.5rem' }} />
          {p.reviewCount > 1 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {p.reviewCount} anmeldelser {expanded ? '▴' : '▾'}
            </div>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} style={{ background: 'var(--bg)', padding: '1rem 1.5rem' }}>
            {reviews ? (
              <ReviewList reviews={reviews} />
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Henter anmeldelser...</span>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  )
})

// " · 2024 (2021)" when Vinmonopolet sells a newer vintage than the one reviewed, otherwise " · 2021"
function Vintages({ current, reviewed }: { current: number | null; reviewed: number | null }) {
  const shown = current ?? reviewed
  if (shown == null) return null
  const differs = current != null && reviewed != null && current !== reviewed
  return (
    <span title={differs ? `Vinmonopolet selger ${current}, anmeldelsen gjelder ${reviewed}` : undefined}>
      {` · ${shown}`}{differs && ` (${reviewed})`}
    </span>
  )
}

function ReviewList({ reviews }: { reviews: WineReview[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 800 }}>
      {reviews.map(r => (
        <div key={r.id}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            <strong style={{ color: 'var(--text)' }}>{r.vintage ?? 'Uten årgang'}</strong>
            {' · '}{r.score} p · <Terningkast grade={r.grade} size={18} />
            {' · '}{new Date(r.reviewedAt).toLocaleDateString('nb-NO')}
            {r.price != null && ` · ${r.price.toFixed(2)} kr ved anmeldelse`}
          </div>
          {r.lead && <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{r.lead}</div>}
          {r.authorDescription && (
            <div style={{ fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{r.authorDescription.trim()}</div>
          )}
          {r.articleUrl && (
            <a href={r.articleUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem' }}>Les hos VG →</a>
          )}
        </div>
      ))}
    </div>
  )
}

// VG's terningkast dice, served from public/terningkast/1.svg–6.svg
function Terningkast({ grade, size, style }: { grade: number; size: number; style?: React.CSSProperties }) {
  if (grade < 1 || grade > 6) return <span style={style}>{grade}</span>
  return (
    <img
      src={`/terningkast/${grade}.svg`}
      alt={`Terningkast ${grade}`}
      title={`Terningkast ${grade}`}
      width={size}
      height={size}
      style={{ verticalAlign: 'middle', ...style }}
    />
  )
}
