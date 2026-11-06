let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch { return null }
}

export function playTick(speed: number) {
  const c = getCtx()
  if (!c) return
  try {
    const len = Math.floor(c.sampleRate * 0.022)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.25))
    const src = c.createBufferSource()
    src.buffer = buf
    const gain = c.createGain()
    gain.gain.value = 0.06 + speed * 0.1
    src.connect(gain)
    gain.connect(c.destination)
    src.start()
  } catch { /* ignore */ }
}

// Recorded opening sounds, played as the winner is revealed. Only bubbles pop; a still wine or a
// spirit is uncorked quietly and poured
const OPENINGS = {
  can: '/sounds/can-open.mp3',
  sparkling: '/sounds/cork-pop.mp3',
  wine: '/sounds/uncork.m4a',
  spirit: '/sounds/uncork.m4a',
}
export type Opening = keyof typeof OPENINGS

// Seconds into each clip where the cork comes out or the can cracks open, for timing the animation to it
export const POP_AT: Record<Opening, number> = {
  can: 0.52,
  sparkling: 0.36,
  wine: 0.28,
  spirit: 0.28,
}

// Seconds into each clip where the pour starts and stops, once the bottle or can has opened and tipped:
// while the uncorking clip glugs, and for the can and bubbles, while their pouring sounds play
export const POUR_AT: Record<Opening, { start: number; end: number }> = {
  can: { start: 0.95, end: 2.7 },
  sparkling: { start: 0.8, end: 2.8 },
  wine: { start: 0.7, end: 2.8 },
  spirit: { start: 0.7, end: 2.8 },
}

// A separate pouring sound, started with the pour, for the can and the bubbles, whose own clips end at the
// hiss and the pop: a can of beer, and a lighter, brighter champagne pour
const POURS: Partial<Record<Opening, string>> = {
  can: '/sounds/fizzy-pour.mp3',
  sparkling: '/sounds/sparkling-pour.mp3',
}

const samples = new Map<string, Promise<AudioBuffer | null>>()

function loadSample(c: AudioContext, url: string): Promise<AudioBuffer | null> {
  let sample = samples.get(url)
  if (!sample) {
    sample = fetch(url)
      .then(r => r.arrayBuffer())
      .then(b => c.decodeAudioData(b))
      .catch(() => { samples.delete(url); return null })
    samples.set(url, sample)
  }
  return sample
}

// Fetch the opening sounds ahead of time so the reveal isn't delayed by the download
export function preloadOpenings() {
  const c = getCtx()
  if (!c) return
  for (const url of [...Object.values(OPENINGS), ...Object.values(POURS)]) loadSample(c, url)
}

// The opening sound, and its pouring sound, if it has one, timed to start with the pour
export async function playWinnerSound(opening: Opening) {
  const c = getCtx()
  if (!c) return
  const pourUrl = POURS[opening]
  const [buffer, pour] = await Promise.all([
    loadSample(c, OPENINGS[opening]),
    pourUrl ? loadSample(c, pourUrl) : Promise.resolve(null),
  ])
  const now = c.currentTime
  play(c, buffer, now)
  play(c, pour, now + POUR_AT[opening].start)
}

function play(c: AudioContext, buffer: AudioBuffer | null, at: number) {
  if (!buffer) return
  try {
    const src = c.createBufferSource()
    src.buffer = buffer
    src.connect(c.destination)
    src.start(at)
  } catch { /* ignore */ }
}
