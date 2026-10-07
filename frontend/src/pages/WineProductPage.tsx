import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import type { WineProductDetail, WineReview } from '../types'
import NavBar from '../components/NavBar'
import { Terningkast } from '../components/Terningkast'
import { formatVolume, HortenStock, twoDecimals } from '../components/WineProductInfo'

// One VG-reviewed product with all its reviews, at /vinanmeldelser/:productId
export default function WineProductPage() {
  const { productId = '' } = useParams()
  const [detail, setDetail] = useState<WineProductDetail | null>(null)
  const [error, setError] = useState<'notFound' | 'failed' | null>(null)

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setError(null)
    api.get<WineProductDetail>(`/api/wine-reviews/products/${encodeURIComponent(productId)}`)
      .then(r => { if (!cancelled) setDetail(r.data) })
      .catch((e: { response?: { status?: number } }) => {
        if (!cancelled) setError(e.response?.status === 404 ? 'notFound' : 'failed')
      })
    return () => { cancelled = true }
  }, [productId])

  const p = detail?.product
  const subtitle = p && [p.productTypeName, p.country, p.regionDetailed].filter(Boolean).join(' · ')

  return (
    <div className="page">
      <NavBar />

      <div className="page-header">
        <div className="container">
          <h1 className="page-title">{p ? p.productShortName ?? 'Ukjent navn' : 'VG-anmeldelse'}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="page-content">
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <BackLink />
          {error ? (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                {error === 'notFound'
                  ? `Fant ingen VG-anmeldelse av varenummer ${productId}.`
                  : 'Kunne ikke hente produktet. Prøv å laste siden på nytt.'}
              </div>
            </div>
          ) : !detail ? (
            <div className="card"><div className="card-body">Henter produktet...</div></div>
          ) : (
            <>
              <ProductCard detail={detail} />
              <div className="card">
                <div className="card-header">
                  {detail.reviews.length === 1 ? '1 anmeldelse' : `${detail.reviews.length} anmeldelser`}
                </div>
                {detail.reviews.map(r => <ReviewCard key={r.id} review={r} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Back to wherever the link was clicked (the admin dashboard, the list), or to the list when the page
// was opened directly
function BackLink() {
  const navigate = useNavigate()
  const hasHistory = useLocation().key !== 'default'
  const style: React.CSSProperties = { alignSelf: 'flex-start', fontSize: '0.9rem' }
  return hasHistory ? (
    <button className="btn btn-outline btn-sm" style={style} onClick={() => navigate(-1)}>← Tilbake</button>
  ) : (
    <Link to="/vinanmeldelser" className="btn btn-outline btn-sm" style={style}>← Alle VG-anmeldelser</Link>
  )
}

function ProductCard({ detail }: { detail: WineProductDetail }) {
  const p = detail.product
  // Vinmonopolet's current vintage when known, with the reviewed one if it differs
  const vintage = p.vmpVintage ?? p.vintage
  const vintageDiffers = p.vmpVintage != null && p.vintage != null && p.vmpVintage !== p.vintage
  const region = [p.regionDetailed, detail.subRegion].filter(Boolean).join(', ')

  return (
    <div className="card">
      <div className="card-body" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <img
          src={p.imageUrl}
          alt={p.productShortName ?? ''}
          style={{ width: 200, height: 200, objectFit: 'contain', flexShrink: 0 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />

        <dl style={{
          flex: '1 1 320px', display: 'grid', gridTemplateColumns: 'max-content 1fr',
          columnGap: '1.25rem', rowGap: '0.4rem', fontSize: '0.95rem',
        }}>
          <Fact label="Varenummer">
            <a href={p.vinmonopoletUrl} target="_blank" rel="noreferrer">#{p.productId} hos Vinmonopolet ↗</a>
            {detail.discontinued && <span className="badge badge-wine" style={{ marginLeft: '0.5rem' }}>Utgått</span>}
          </Fact>
          <Fact label="Type">{p.productTypeName}</Fact>
          <Fact label="Land">{p.country}</Fact>
          <Fact label="Region">{region}</Fact>
          <Fact label="Drue">{detail.grape}</Fact>
          <Fact label="Årgang">
            {vintage != null && (
              <span title={vintageDiffers ? `Vinmonopolet selger ${p.vmpVintage}, siste anmeldelse gjelder ${p.vintage}` : undefined}>
                {vintage}{vintageDiffers && ` (anmeldt: ${p.vintage})`}
              </span>
            )}
          </Fact>
          <Fact label="Volum">{p.volume != null && formatVolume(p.volume)}</Fact>
          <Fact label="Pris">{p.price != null && `${p.price.toFixed(2)} kr`}</Fact>
          <Fact label="Pris/poeng">
            {p.pricePerScore != null && (
              <span title="Literpris delt på poeng. Lavere er bedre kjøp.">{twoDecimals.format(p.pricePerScore)}</span>
            )}
          </Fact>
          <Fact label="Horten"><HortenStock p={p} /></Fact>
        </dl>

        <div style={{ textAlign: 'center', minWidth: 140 }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>
            {p.score}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}> p</span>
          </div>
          <Terningkast grade={p.grade} size={56} style={{ marginTop: '0.5rem' }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Siste anmeldelse{p.vintage != null && ` (${p.vintage})`}
            <br />
            {new Date(p.lastReviewedAt).toLocaleDateString('nb-NO')}
          </div>
        </div>
      </div>
    </div>
  )
}

// A label and value in the product facts, shown as a dash when there's no value
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  const empty = children == null || children === false || children === ''
  return (
    <>
      <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd>{empty ? <span style={{ color: 'var(--text-muted)' }}>—</span> : children}</dd>
    </>
  )
}

// Vinmonopolet's taste profile terms
const TASTE_PROFILE: { key: 'fullness' | 'freshness' | 'tannins' | 'sweetness'; label: string }[] = [
  { key: 'fullness', label: 'Fylde' },
  { key: 'freshness', label: 'Friskhet' },
  { key: 'tannins', label: 'Garvestoffer' },
  { key: 'sweetness', label: 'Sødme' },
]

function ReviewCard({ review: r }: { review: WineReview }) {
  // 0 is how VG marks a value that isn't given, e.g. tannins in a white wine
  const profile = TASTE_PROFILE.filter(t => (r[t.key] ?? 0) > 0)
  const notes = [
    { label: 'Farge', text: r.colour },
    { label: 'Lukt', text: r.odour },
    { label: 'Smak', text: r.taste },
  ].filter(n => n.text)

  return (
    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <strong style={{ fontSize: '1.1rem' }}>{r.vintage ?? 'Uten årgang'}</strong>
        <span>
          <span style={{ fontWeight: 700 }}>{r.score}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> p</span>
          <Terningkast grade={r.grade} size={24} style={{ marginLeft: '0.4rem' }} />
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {new Date(r.reviewedAt).toLocaleDateString('nb-NO')}
          {r.price != null && ` · ${r.price.toFixed(2)} kr ved anmeldelse`}
          {r.alcoholLevel != null && ` · ${r.alcoholLevel.toLocaleString('nb-NO')} %`}
          {r.sugarContent && ` · sukker ${r.sugarContent} g/l`}
        </span>
      </div>

      <div style={{ maxWidth: 800 }}>
        {r.lead && <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{r.lead}</div>}
        {r.authorDescription && (
          <div style={{ fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{r.authorDescription.trim()}</div>
        )}
      </div>

      {(notes.length > 0 || profile.length > 0) && (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.9rem' }}>
          {notes.length > 0 && (
            <dl style={{ flex: '1 1 360px', maxWidth: 640, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: '1rem', rowGap: '0.25rem' }}>
              {notes.map(n => (
                <Fact key={n.label} label={n.label}>{n.text}</Fact>
              ))}
            </dl>
          )}
          {profile.length > 0 && (
            <div style={{ flex: '0 1 260px', display: 'grid', gridTemplateColumns: 'max-content 1fr max-content', columnGap: '0.6rem', rowGap: '0.35rem', alignItems: 'center' }}>
              {profile.map(t => <TasteBar key={t.key} label={t.label} value={r[t.key]!} />)}
            </div>
          )}
        </div>
      )}

      {r.articleUrl && (
        <a href={r.articleUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          Les hos VG →
        </a>
      )}
    </div>
  )
}

function TasteBar({ label, value }: { label: string; value: number }) {
  return (
    <>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div
        role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={12} aria-valuenow={value}
        style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}
      >
        <div style={{ width: `${(Math.min(value, 12) / 12) * 100}%`, height: '100%', background: 'var(--wine)' }} />
      </div>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{value}/12</span>
    </>
  )
}
