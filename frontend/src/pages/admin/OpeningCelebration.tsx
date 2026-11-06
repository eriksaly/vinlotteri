import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { POP_AT, type Opening } from '../../audio'

const CONFETTI_COLORS = ['#b32020', '#c86a10', '#a08a00', '#1e7a38', '#1a4db0', '#6b1a80']

// Tilted in toward the winner, so each mouth points the way the confetti flies: 60° from the left, 120° from the right
const SIDES = [
  { side: 'left', tilt: 30, angle: 60 },
  { side: 'right', tilt: -30, angle: 120 },
] as const

// Foam and vapour thrown from the mouth at the pop, fanned upwards
const SPRAY = Array.from({ length: 12 }, (_, i) => {
  const a = (-50 + i * (100 / 11)) * Math.PI / 180
  const d = 60 + (i * 37) % 60
  return { dx: Math.sin(a) * d, dy: -Math.cos(a) * d, r: 3 + (i * 7) % 4, delay: (i % 4) * 0.03 }
})

// A bottle (or can, for an all-beer prize) on each side of the winner, opened in time with the opening
// sound. Confetti bursts out of their mouths at the pop, then keeps streaming for a while
export default function OpeningCelebration({ opening, zIndex }: { opening: Opening; zIndex: number }) {
  const mouths = useRef<(SVGCircleElement | null)[]>([])

  useEffect(() => {
    let frame = 0
    const pop = setTimeout(() => {
      const origins = SIDES.map((s, i) => {
        const r = mouths.current[i]?.getBoundingClientRect()
        const origin = r
          ? { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
          : { x: i === 0 ? 0 : 1, y: 0.5 }
        return { origin, angle: s.angle }
      })
      for (const { origin, angle } of origins) {
        confetti({ particleCount: 40, angle, spread: 35, startVelocity: 55, origin, colors: CONFETTI_COLORS, zIndex })
      }
      const end = Date.now() + 3000
      const stream = () => {
        for (const { origin, angle } of origins) {
          confetti({ particleCount: 3, angle, spread: 55, origin, colors: CONFETTI_COLORS, zIndex })
        }
        if (Date.now() < end) frame = requestAnimationFrame(stream)
      }
      stream()
    }, POP_AT[opening] * 1000)
    return () => { clearTimeout(pop); cancelAnimationFrame(frame) }
  }, [opening, zIndex])

  return (
    <>
      {SIDES.map((s, i) => (
        <div key={s.side} className="opening" style={{
          [s.side]: '5vw',
          transform: `translateY(-50%) rotate(${s.tilt}deg)`,
          '--pop': `${POP_AT[opening]}s`,
        } as React.CSSProperties}>
          {opening === 'sparkling' && <WineBottle sparkling mouthRef={el => { mouths.current[i] = el }} />}
          {opening === 'wine' && <WineBottle sparkling={false} mouthRef={el => { mouths.current[i] = el }} />}
          {opening === 'can' && <BeerCan mouthRef={el => { mouths.current[i] = el }} />}
          {opening === 'spirit' && <SpiritBottle mouthRef={el => { mouths.current[i] = el }} />}
        </div>
      ))}
    </>
  )
}

type MouthRef = (el: SVGCircleElement | null) => void

// Bubbles get gold foil, a shake and a cork that shoots off; a still wine's cork eases out and slides off
function WineBottle({ sparkling, mouthRef }: { sparkling: boolean; mouthRef: MouthRef }) {
  return (
    <svg className={sparkling ? 'opening-bottle opening-fizzy' : 'opening-bottle'} viewBox="0 0 60 200" aria-hidden="true">
      <rect className={sparkling ? 'opening-cork' : 'opening-uncork'} x="23" y="2" width="14" height="22" rx="3" fill="#c89b5e" />
      <path d="M22 14 H38 V50 C38 58 55 64 55 86 V192 Q55 198 49 198 H11 Q5 198 5 192 V86 C5 64 22 58 22 50 Z" fill="#1f3d2b" />
      <rect x="21" y="13" width="18" height="27" rx="1" fill={sparkling ? '#C5A028' : '#7a1f2b'} />
      <rect x="9" y="112" width="42" height="52" rx="3" fill="#f3ead7" />
      <rect x="9" y="128" width="42" height="8" fill="#7a1f2b" />
      <rect x="10" y="88" width="5" height="100" rx="2.5" fill="white" opacity="0.18" />
      <Spray x={30} y={12} color={sparkling ? 'rgba(255,255,255,0.85)' : '#c0394f'} />
      <circle ref={mouthRef} cx="30" cy="8" r="1" fill="none" />
    </svg>
  )
}

// A whisky-style bottle with a T-cork, which eases up and slides off rather than shooting away
function SpiritBottle({ mouthRef }: { mouthRef: MouthRef }) {
  return (
    <svg className="opening-spirit" viewBox="0 0 70 200" aria-hidden="true">
      <g className="opening-uncork">
        <rect x="29" y="8" width="12" height="18" fill="#c89b5e" />
        <rect x="24" y="0" width="22" height="10" rx="2" fill="#5a3418" />
      </g>
      <path d="M27 14 H43 V42 Q43 50 52 52 Q64 55 64 66 V192 Q64 198 58 198 H12 Q6 198 6 192 V66 Q6 55 18 52 Q27 50 27 42 Z" fill="#b8692a" />
      <path d="M27 14 H43 V42 Q43 50 52 52 Q64 55 64 66 V72 H6 V66 Q6 55 18 52 Q27 50 27 42 Z" fill="#e8dcc8" opacity="0.35" />
      <rect x="26" y="13" width="18" height="9" rx="1" fill="#1c1c1c" />
      <rect x="12" y="100" width="46" height="56" rx="2" fill="#1c1c1c" stroke="#C5A028" strokeWidth="1.5" />
      <rect x="18" y="124" width="34" height="3" fill="#C5A028" />
      <rect x="11" y="76" width="5" height="112" rx="2.5" fill="white" opacity="0.18" />
      <Spray x={35} y={12} color="#e3a65a" />
      <circle ref={mouthRef} cx="35" cy="8" r="1" fill="none" />
    </svg>
  )
}

function BeerCan({ mouthRef }: { mouthRef: MouthRef }) {
  return (
    <svg className="opening-can" viewBox="0 0 80 140" aria-hidden="true">
      <path d="M6 12 V128 Q6 134 14 135 H66 Q74 134 74 128 V12 Z" fill="#d99a1e" />
      <rect x="6" y="52" width="68" height="40" fill="#8a5a10" />
      <text x="40" y="80" textAnchor="middle" fontFamily="sans-serif" fontWeight="800" fontSize="22" fill="#f6e7c1">ØL</text>
      <rect x="11" y="20" width="6" height="104" rx="3" fill="white" opacity="0.2" />
      <ellipse cx="40" cy="12" rx="34" ry="6" fill="#d7dbde" stroke="#9aa0a6" strokeWidth="1.5" />
      <ellipse className="opening-hole" cx="29" cy="12" rx="5" ry="2" fill="#5b6167" />
      <rect className="opening-tab" x="38" y="10.5" width="20" height="4" rx="2" fill="#b8bec4" stroke="#8d939a" strokeWidth="0.8" />
      <circle cx="40" cy="12.5" r="1.6" fill="#8d939a" />
      <Spray x={29} y={11} color="#fff4d6" />
      <circle ref={mouthRef} cx="29" cy="8" r="1" fill="none" />
    </svg>
  )
}

function Spray({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <>
      {SPRAY.map((d, i) => (
        <circle key={i} className="opening-drop" cx={x} cy={y} r={d.r} fill={color} style={{
          '--dx': `${d.dx}px`, '--dy': `${d.dy}px`,
          animationDelay: `calc(var(--pop) + ${d.delay}s)`,
        } as React.CSSProperties} />
      ))}
    </>
  )
}
