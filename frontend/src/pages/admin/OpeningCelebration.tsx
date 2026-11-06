import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { POP_AT, POUR_AT, type Opening } from '../../audio'

const CONFETTI_COLORS = ['#b32020', '#c86a10', '#a08a00', '#1e7a38', '#1a4db0', '#6b1a80']

// Tilted in toward the winner, so each mouth points the way the confetti flies: 60° from the left, 120° from the right.
// Once open, each bottle or can tips a further pourTilt toward the winner to pour into its glass
const SIDES = [
  { side: 'left', tilt: 30, angle: 60, pourTilt: 85 },
  { side: 'right', tilt: -30, angle: 120, pourTilt: -85 },
] as const

// Foam and vapour thrown from the mouth at the pop, fanned upwards
const SPRAY = Array.from({ length: 12 }, (_, i) => {
  const a = (-50 + i * (100 / 11)) * Math.PI / 180
  const d = 60 + (i * 37) % 60
  return { dx: Math.sin(a) * d, dy: -Math.cos(a) * d, r: 3 + (i * 7) % 4, delay: (i % 4) * 0.03 }
})

// How far down a bottle it is tipped about, as a fraction of its height: low enough that the base
// stays on screen while the neck swings over the glass. Matches .opening-pourer's transform-origin
const PIVOT = 0.75

// Where the mouth is in each drawing, as fractions of its width and height. The can's drinking hole is off
// to one side of the lid; the left can is drawn mirrored so its hole is on the side it pours from
function mouthAt(opening: Opening, side: 'left' | 'right'): [number, number] {
  if (opening === 'can') return [side === 'left' ? 51 / 80 : 29 / 80, 12 / 140]
  return [0.5, 8 / 200]
}

export type Drink = 'red' | 'white' | 'rose' | 'sparkling' | 'spirit' | 'beer'

const DRINK_COLORS: Record<Drink, string> = {
  red: '#7d1428',
  white: '#e6cf73',
  rose: '#ee8e9b',
  sparkling: '#efd98a',
  spirit: '#c27424',
  beer: '#d9962b',
}

// Where a pouring bottle's mouth ends up once tipped, and how tall the bottle is, in viewport pixels
type PourSpot = { x: number; y: number; size: number }

// A bottle (or can, for an all-beer prize) on each side of the winner, opened in time with the opening
// sound, then tipped to pour into a glass. Bubbles burst confetti out of their mouths at the pop; otherwise
// it bursts in from the sides, and it keeps streaming in from the sides while the bottles pour
export default function OpeningCelebration({ opening, drink, zIndex }: { opening: Opening; drink: Drink; zIndex: number }) {
  const mouths = useRef<(SVGCircleElement | null)[]>([])
  const holders = useRef<(HTMLDivElement | null)[]>([])
  const pour = POUR_AT[opening]
  const [spots, setSpots] = useState<(PourSpot | null)[]>([])

  // Works out where each mouth will be once its bottle has tipped, so the glass can be set beneath it
  // before the pour starts, and again if the window is resized. It's worked out from the bottle's
  // holder, which never moves, rather than from the mouth, which does once the bottle tips
  useEffect(() => {
    const place = () => setSpots(SIDES.map((s, i) => {
      const holder = holders.current[i]
      if (!holder) return null
      const box = holder.getBoundingClientRect()
      const width = holder.offsetWidth, size = holder.offsetHeight
      const tilt = s.tilt * Math.PI / 180, tipped = (s.tilt + s.pourTilt) * Math.PI / 180
      // The pivot sits below the bottle's centre, along the bottle as it is already tilted
      const below = (PIVOT - 0.5) * size
      const px = box.left + box.width / 2 - below * Math.sin(tilt)
      const py = box.top + box.height / 2 + below * Math.cos(tilt)
      // Then the mouth, as it sits from the pivot on the upright bottle, turned with the tipped bottle
      const [fx, fy] = mouthAt(opening, s.side)
      const lx = (fx - 0.5) * width, ly = (fy - PIVOT) * size
      return {
        x: px + lx * Math.cos(tipped) - ly * Math.sin(tipped),
        y: py + lx * Math.sin(tipped) + ly * Math.cos(tipped),
        size,
      }
    }))
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [opening])

  useEffect(() => {
    let frame = 0
    const pop = setTimeout(() => {
      const sides = SIDES.map((s, i) => ({ origin: { x: i === 0 ? 0 : 1, y: 0.5 }, angle: s.angle }))
      const bursts = opening !== 'sparkling' ? sides : SIDES.map((s, i) => {
        const r = mouths.current[i]?.getBoundingClientRect()
        return r
          ? { origin: { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }, angle: s.angle }
          : sides[i]
      })
      for (const { origin, angle } of bursts) {
        confetti({ particleCount: 40, angle, spread: 35, startVelocity: 55, origin, colors: CONFETTI_COLORS, zIndex })
      }
      const end = Date.now() + 3000
      const stream = () => {
        for (const { origin, angle } of sides) {
          confetti({ particleCount: 3, angle, spread: 55, origin, colors: CONFETTI_COLORS, zIndex })
        }
        if (Date.now() < end) frame = requestAnimationFrame(stream)
      }
      stream()
    }, POP_AT[opening] * 1000)
    return () => { clearTimeout(pop); cancelAnimationFrame(frame) }
  }, [opening, zIndex])

  const mouthRef = (i: number) => (el: SVGCircleElement | null) => { mouths.current[i] = el }

  return (
    <>
      {spots.map((spot, i) => spot && (
        <Pour key={i} spot={spot} drink={drink} start={pour.start} end={pour.end} />
      ))}
      {SIDES.map((s, i) => (
        <div key={s.side} ref={el => { holders.current[i] = el }} className="opening" style={{
          [s.side]: '5vw',
          transform: `translateY(-50%) rotate(${s.tilt}deg)`,
          '--pop': `${POP_AT[opening]}s`,
          '--pour-tilt': `${s.pourTilt}deg`,
          '--pour-end': `${pour.end}s`,
        } as React.CSSProperties}>
          <div className="opening-pourer">
            {opening === 'sparkling' && <WineBottle kind="sparkling" mouthRef={mouthRef(i)} />}
            {opening === 'wine' && <WineBottle kind={drink === 'white' ? 'white' : 'still'} mouthRef={mouthRef(i)} />}
            {opening === 'can' && <BeerCan flip={s.side === 'left'} mouthRef={mouthRef(i)} />}
            {opening === 'spirit' && <SpiritBottle mouthRef={mouthRef(i)} />}
          </div>
        </div>
      ))}
    </>
  )
}

// The glass for each drink: its width as a fraction of the bottle's (or the shorter can's) height, and how
// far down the drawing the stream disappears into the drink, at the bottom of the bowl or on a thick base
const GLASSES = {
  wine: { width: 0.3, bottom: 49, Glass: WineGlass },
  flute: { width: 0.3, bottom: 55, Glass: Flute },
  tumbler: { width: 0.26, bottom: 48, Glass: Tumbler },
  pint: { width: 0.42, bottom: 92, Glass: BeerGlass },
}

const GLASS_FOR: Record<Drink, keyof typeof GLASSES> = {
  red: 'wine', white: 'wine', rose: 'wine', sparkling: 'flute', spirit: 'tumbler', beer: 'pint',
}

// The stream from a tipped bottle's mouth and the glass it fills: a wine glass, a flute for bubbles, a tumbler
// for spirits or a pint glass for beer
function Pour({ spot, drink, start, end }: { spot: PourSpot; drink: Drink; start: number; end: number }) {
  const color = DRINK_COLORS[drink]
  const { width: widthFactor, bottom: bottomAt, Glass } = GLASSES[GLASS_FOR[drink]]
  const width = spot.size * widthFactor
  const scale = width / 60
  const rimTop = spot.y + spot.size * 0.1
  const bottom = rimTop + bottomAt * scale
  const streamWidth = Math.max(3, spot.size * 0.03)
  const timing = {
    '--pour-start': `${start}s`,
    '--pour-end': `${end}s`,
    '--pour-len': `${end - start}s`,
  } as React.CSSProperties
  return (
    <>
      <div className="opening-stream" style={{
        ...timing,
        left: spot.x - streamWidth / 2, top: spot.y, width: streamWidth, height: bottom - spot.y, background: color,
      }} />
      <div className="opening-glass" style={{ ...timing, left: spot.x - width / 2, top: rimTop, width }}>
        <Glass color={color} />
      </div>
    </>
  )
}

function WineGlass({ color }: { color: string }) {
  const bowl = 'M6 0 H54 C56 28 46 46 30 48 C14 46 4 28 6 0 Z'
  return (
    <svg viewBox="0 -2 60 102" aria-hidden="true">
      <clipPath id="opening-wine-bowl"><path d={bowl} /></clipPath>
      <path d={bowl} fill="rgba(255,255,255,0.08)" />
      <g clipPath="url(#opening-wine-bowl)">
        <rect className="opening-fill" x="0" y="22" width="60" height="30" fill={color} style={{ '--empty': '28px' } as React.CSSProperties} />
      </g>
      <path d={bowl} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" />
      <rect x="28.5" y="47" width="3" height="46" fill="rgba(255,255,255,0.75)" />
      <ellipse cx="30" cy="95" rx="17" ry="3.5" fill="rgba(255,255,255,0.75)" />
      <path d="M12 6 C11 18 14 28 20 34" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  )
}

function Tumbler({ color }: { color: string }) {
  const inside = 'M6 0 L10 46 H50 L54 0 Z'
  return (
    <svg viewBox="0 -2 60 62" aria-hidden="true">
      <clipPath id="opening-tumbler"><path d={inside} /></clipPath>
      <path d={inside} fill="rgba(255,255,255,0.08)" />
      <g clipPath="url(#opening-tumbler)">
        <rect className="opening-fill" x="0" y="28" width="60" height="20" fill={color} style={{ '--empty': '18px' } as React.CSSProperties} />
      </g>
      <path d="M6 0 L10.5 54 Q11 58 15 58 H45 Q49 58 49.5 54 L54 0" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" />
      <path d="M10 46 H50 L49.5 54 Q49 58 45 58 H15 Q11 58 10.5 54 Z" fill="rgba(255,255,255,0.3)" />
      <path d="M12 6 L15 40" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  )
}

// A tall, narrow flute, filled with bubbles under a thin head of mousse that rises with them
function Flute({ color }: { color: string }) {
  const bowl = 'M18 0 H42 C43 30 40 52 30 56 C20 52 17 30 18 0 Z'
  return (
    <svg viewBox="0 -2 60 110" aria-hidden="true">
      <clipPath id="opening-flute"><path d={bowl} /></clipPath>
      <path d={bowl} fill="rgba(255,255,255,0.08)" />
      <g clipPath="url(#opening-flute)">
        <g className="opening-fill" style={{ '--empty': '50px' } as React.CSSProperties}>
          <rect x="0" y="10" width="60" height="52" fill={color} />
          <rect x="0" y="6" width="60" height="5" fill="#fffbe8" />
          {[[26, 20], [33, 28], [29, 36], [35, 44], [27, 48], [31, 16]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.9" fill="white" opacity="0.7" />
          ))}
        </g>
      </g>
      <path d={bowl} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" />
      <rect x="28.8" y="55" width="2.4" height="45" fill="rgba(255,255,255,0.75)" />
      <ellipse cx="30" cy="102" rx="14" ry="3" fill="rgba(255,255,255,0.75)" />
      <path d="M21 6 C20.5 22 22 36 25 46" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
    </svg>
  )
}

// A tapered pint, filled with beer under a head of foam that rises with it
function BeerGlass({ color }: { color: string }) {
  const inside = 'M4 0 L10 90 H50 L56 0 Z'
  return (
    <svg viewBox="0 -2 60 104" aria-hidden="true">
      <clipPath id="opening-pint"><path d={inside} /></clipPath>
      <path d={inside} fill="rgba(255,255,255,0.08)" />
      <g clipPath="url(#opening-pint)">
        <g className="opening-fill" style={{ '--empty': '82px' } as React.CSSProperties}>
          <rect x="0" y="18" width="60" height="80" fill={color} />
          <rect x="0" y="8" width="60" height="11" fill="#fbf3dc" />
        </g>
      </g>
      <path d="M4 0 L10.5 96 Q11 100 15 100 H45 Q49 100 49.5 96 L56 0" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" />
      <path d="M10 90 H50 L49.5 96 Q49 100 45 100 H15 Q11 100 10.5 96 Z" fill="rgba(255,255,255,0.3)" />
      <path d="M10 6 L15 80" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  )
}

type MouthRef = (el: SVGCircleElement | null) => void

// Bubbles get gold foil, a shake and a cork that shoots off; a still wine's cork is just lifted out.
// A white wine comes in a slim, pale bottle with its golden wine showing through the glass
function WineBottle({ kind, mouthRef }: { kind: 'sparkling' | 'still' | 'white'; mouthRef: MouthRef }) {
  if (kind === 'white') return <WhiteWineBottle mouthRef={mouthRef} />
  const sparkling = kind === 'sparkling'
  return (
    <svg className={sparkling ? 'opening-bottle opening-fizzy' : 'opening-bottle opening-still'} viewBox="0 0 60 200" aria-hidden="true">
      <rect className={sparkling ? 'opening-cork' : 'opening-uncork'} x="23" y="2" width="14" height="22" rx="3" fill="#c89b5e" />
      <path d="M22 14 H38 V50 C38 58 55 64 55 86 V192 Q55 198 49 198 H11 Q5 198 5 192 V86 C5 64 22 58 22 50 Z" fill="#1f3d2b" />
      <rect x="21" y="13" width="18" height="27" rx="1" fill={sparkling ? '#C5A028' : '#7a1f2b'} />
      <rect x="9" y="112" width="42" height="52" rx="3" fill="#f3ead7" />
      <rect x="9" y="128" width="42" height="8" fill="#7a1f2b" />
      <rect x="10" y="88" width="5" height="100" rx="2.5" fill="white" opacity="0.18" />
      {sparkling && <Spray x={30} y={12} color="rgba(255,255,255,0.85)" />}
      <circle ref={mouthRef} cx="30" cy="8" r="1" fill="none" />
    </svg>
  )
}

// A tall, slender Riesling-style bottle in pale clear glass, with a long neck and gently sloping shoulders.
// Same 60×200 drawing and mouth as the other wine bottle, so it tips and pours the same way
function WhiteWineBottle({ mouthRef }: { mouthRef: MouthRef }) {
  const glass = 'M24.5 14 H35.5 V62 C35.5 80 49 88 49 108 V192 Q49 198 43 198 H17 Q11 198 11 192 V108 C11 88 24.5 80 24.5 62 Z'
  return (
    <svg className="opening-bottle opening-still" viewBox="0 0 60 200" aria-hidden="true">
      <clipPath id="opening-white-glass"><path d={glass} /></clipPath>
      <rect className="opening-uncork" x="25.5" y="2" width="9" height="22" rx="2.5" fill="#c89b5e" />
      <path d={glass} fill="#e3eecf" opacity="0.35" />
      <rect x="0" y="74" width="60" height="126" fill="#e6cf73" opacity="0.85" clipPath="url(#opening-white-glass)" />
      <path d={glass} fill="none" stroke="#f1f6e6" strokeWidth="1.2" opacity="0.7" />
      <rect x="23.5" y="13" width="13" height="34" rx="1" fill="#d9c27e" />
      <rect x="23.5" y="42" width="13" height="2.5" fill="#a88c3c" />
      <rect x="14" y="128" width="32" height="40" rx="2" fill="#fbf7ea" />
      <rect x="14" y="138" width="32" height="2.5" fill="#a88c3c" />
      <rect x="19" y="148" width="22" height="2" fill="#c9b98a" />
      <rect x="15" y="100" width="4" height="88" rx="2" fill="white" opacity="0.3" />
      <circle ref={mouthRef} cx="30" cy="8" r="1" fill="none" />
    </svg>
  )
}

// A whisky-style bottle with a T-cork, which is lifted out rather than shooting away
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
      <circle ref={mouthRef} cx="35" cy="8" r="1" fill="none" />
    </svg>
  )
}

// The tab, hole and spray are mirrored when flip is set, putting the hole on the other side of the lid
function BeerCan({ flip, mouthRef }: { flip: boolean; mouthRef: MouthRef }) {
  return (
    <svg className="opening-can" viewBox="0 0 80 140" aria-hidden="true">
      <path d="M6 12 V128 Q6 134 14 135 H66 Q74 134 74 128 V12 Z" fill="#d99a1e" />
      <rect x="6" y="52" width="68" height="40" fill="#8a5a10" />
      <text x="40" y="80" textAnchor="middle" fontFamily="sans-serif" fontWeight="800" fontSize="22" fill="#f6e7c1">ØL</text>
      <rect x="11" y="20" width="6" height="104" rx="3" fill="white" opacity="0.2" />
      <ellipse cx="40" cy="12" rx="34" ry="6" fill="#d7dbde" stroke="#9aa0a6" strokeWidth="1.5" />
      <g transform={flip ? 'translate(80 0) scale(-1 1)' : undefined}>
        <ellipse className="opening-hole" cx="29" cy="12" rx="5" ry="2" fill="#5b6167" />
        <rect className="opening-tab" x="38" y="10.5" width="20" height="4" rx="2" fill="#b8bec4" stroke="#8d939a" strokeWidth="0.8" />
        <circle cx="40" cy="12.5" r="1.6" fill="#8d939a" />
        <Spray x={29} y={11} color="#fff4d6" />
        <circle ref={mouthRef} cx="29" cy="8" r="1" fill="none" />
      </g>
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
