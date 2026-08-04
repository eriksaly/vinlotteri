export default function AccessDenied() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--wine)',
      flexDirection: 'column', padding: '2rem', textAlign: 'center'
    }}>
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🛡️🍷</div>
        <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Du er ikke verdig
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', marginBottom: '1rem', lineHeight: 1.6 }}>
          Dette er et internt lotteri for ansatte i Integrasjonssystemer — ikke for hvem som helst som snubler innom.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem', marginBottom: '2rem', fontStyle: 'italic' }}>
          Søk jobb hos oss. Kanskje du en dag fortjener en flaske. 🫡
        </p>
        <a
          href="/oauth2/authorization/google"
          style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            borderRadius: '999px',
            textDecoration: 'none',
            fontWeight: 600,
            border: '2px solid rgba(255,255,255,0.4)',
            fontSize: '1rem',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
        >
          🔄 Prøv med riktig konto
        </a>
      </div>
    </div>
  )
}
