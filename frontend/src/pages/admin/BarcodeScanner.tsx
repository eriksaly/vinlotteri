import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser'

export default function BarcodeScanner({ onScanned, onClose }: { onScanned: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()

    reader.decodeFromConstraints(
      { video: { facingMode: 'environment' } },
      videoRef.current!,
      (result) => {
        if (result) {
          controlsRef.current?.stop()
          onScanned(result.getText())
        }
      }
    ).then(controls => {
      controlsRef.current = controls
    }).catch(() => {
      setError('Kunne ikke åpne kamera. Sjekk at nettleseren har tilgang.')
    })

    return () => { controlsRef.current?.stop() }
  }, [onScanned])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '1.5rem', right: '1.5rem',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          color: 'white', width: 44, height: 44, borderRadius: '50%',
          fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >✕</button>

      {error ? (
        <div style={{ color: '#f87171', fontSize: '1rem', textAlign: 'center', padding: '0 2rem' }}>{error}</div>
      ) : (
        <>
          <div style={{ position: 'relative', width: 'min(90vw, 400px)', aspectRatio: '1' }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
              autoPlay
              muted
              playsInline
            />
            {/* Scan frame corners */}
            {(['tl','tr','bl','br'] as const).map(pos => (
              <div key={pos} style={{
                position: 'absolute',
                width: 28, height: 28,
                borderColor: '#e8c84a', borderStyle: 'solid', borderWidth: 0,
                ...(pos === 'tl' ? { top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 } : {}),
                ...(pos === 'tr' ? { top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 } : {}),
                ...(pos === 'bl' ? { bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 } : {}),
                ...(pos === 'br' ? { bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 } : {}),
              }} />
            ))}
            {/* Animated scan line */}
            <div style={{
              position: 'absolute', left: 12, right: 12, height: 2,
              background: 'linear-gradient(90deg, transparent, #e8c84a, transparent)',
              animation: 'scanline 2s ease-in-out infinite',
              top: '50%',
            }} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginTop: '1.5rem' }}>
            Pek kamera mot strekkoden på flasken
          </div>
        </>
      )}

      <style>{`
        @keyframes scanline {
          0%, 100% { top: 20%; opacity: 0.4; }
          50% { top: 80%; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
