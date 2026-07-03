export default function AccessDenied() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--sunset-gradient)',
      flexDirection: 'column', padding: '2rem', textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '-120px', right: '-120px',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,223,61,0.7) 0%, rgba(255,167,84,0) 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ maxWidth: 480, position: 'relative' }}>
        <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>
          <span className="palm-sway">🌴</span>
          <span className="beach-bob" style={{ margin: '0 0.5rem' }}>🛎️</span>
          <span className="palm-sway" style={{ animationDelay: '0.6s' }}>🌴</span>
        </div>
        <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          Ikke på gjestelisten
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', marginBottom: '1rem', lineHeight: 1.6 }}>
          Dette er en privat strandbar for ansatte i Integrasjonssystemer — ikke for hvem som helst som vandret inn fra brygga.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', marginBottom: '2rem', fontStyle: 'italic' }}>
          Søk jobb hos oss. Kanskje neste sommer er du gjesten med paraply-drinken. 🍹🕶️
        </p>
        <a
          href="/oauth2/authorization/google"
          style={{
            display: 'inline-block',
            padding: '0.85rem 2rem',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            borderRadius: '999px',
            textDecoration: 'none',
            fontWeight: 700,
            border: '2px solid rgba(255,255,255,0.5)',
            fontSize: '1rem',
            transition: 'background 0.2s, transform 0.15s',
            backdropFilter: 'blur(4px)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          🔄 Prøv med riktig konto
        </a>
      </div>
    </div>
  )
}
