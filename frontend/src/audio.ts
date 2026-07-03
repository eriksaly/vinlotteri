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

/**
 * Trumpet-like brass: sawtooth through lowpass + bandpass formant, subtle vibrato,
 * fast attack, sustain, quick release. Sounds mariachi-ish when doubled in thirds.
 */
function trumpet(c: AudioContext, freq: number, t: number, duration: number, vol: number) {
  const osc = c.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(freq, t)

  // Vibrato — on longer notes only, so short staccato hits stay tight
  if (duration > 0.25) {
    const lfo = c.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 5.5
    const lfoGain = c.createGain()
    lfoGain.gain.value = freq * 0.012
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency)
    lfo.start(t + 0.15); lfo.stop(t + duration + 0.02)
  }

  // Brass formant: bandpass around ~1.2 kHz for the "buzz", then lowpass to tame
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1200
  bp.Q.value = 0.9
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = Math.min(freq * 6, 6000)
  lp.Q.value = 0.7

  const g = c.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.018)
  g.gain.setValueAtTime(vol, t + Math.max(0.05, duration - 0.04))
  g.gain.exponentialRampToValueAtTime(0.001, t + duration)

  osc.connect(bp); bp.connect(lp); lp.connect(g); g.connect(c.destination)
  osc.start(t); osc.stop(t + duration + 0.02)
}

/** Guitarrón-style deep bass pluck (mariachi bass): triangle with fast decay. */
function guitarron(c: AudioContext, freq: number, t: number, duration: number, vol: number) {
  // Fundamental + octave up (for definition) — both triangle, second much softer
  const parts = [
    { ratio: 1,   gain: 1.0 },
    { ratio: 2,   gain: 0.18 },
  ]
  for (const p of parts) {
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq * p.ratio, t)
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol * p.gain, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + duration + 0.02)
  }
}

/** Vihuela-style chord strum — quick arpeggio of triangle notes, short decay. */
function vihuelaStrum(c: AudioContext, freqs: number[], t: number, vol: number) {
  freqs.forEach((f, i) => {
    const dt = t + i * 0.010
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(f, dt)
    const hp = c.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 200
    const g = c.createGain()
    g.gain.setValueAtTime(0, dt)
    g.gain.linearRampToValueAtTime(vol / Math.max(1, freqs.length - 1), dt + 0.004)
    g.gain.exponentialRampToValueAtTime(0.001, dt + 0.18)
    osc.connect(hp); hp.connect(g); g.connect(c.destination)
    osc.start(dt); osc.stop(dt + 0.22)
  })
}

/** Claves — high-pitched wood click, very short. */
function claves(c: AudioContext, t: number, vol: number) {
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(2500, t)
  osc.frequency.exponentialRampToValueAtTime(1800, t + 0.03)
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
  osc.connect(g); g.connect(c.destination)
  osc.start(t); osc.stop(t + 0.06)
}

/** Short "shhh" — soft noise burst, adds air/energy without stealing the melody. */
function airBurst(c: AudioContext, t: number, duration: number, vol: number) {
  const len = Math.floor(c.sampleRate * duration)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    const p = i / len
    data[i] = (Math.random() * 2 - 1) * Math.sin(p * Math.PI) * (1 - 0.5 * p)
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(3000, t)
  lp.frequency.exponentialRampToValueAtTime(400, t + duration)
  const g = c.createGain()
  g.gain.value = vol
  src.connect(lp); lp.connect(g); g.connect(c.destination)
  src.start(t)
}

/**
 * Mariachi win jingle: short air-whoosh intro → trumpet fanfare pickup →
 * ascending arpeggio + descending cadence with a second trumpet in thirds,
 * over a guitarrón bassline, vihuela off-beat strums, and claves. Ends on a stab.
 */
export function playWin() {
  const c = getCtx()
  if (!c) return
  try {
    const now = c.currentTime

    // Airy intro (keeps a light beach-summer whoosh under the brass)
    airBurst(c, now, 0.50, 0.15)

    // "¡Ta-ta-taaa!" pickup grace notes
    trumpet(c, 523, now + 0.05, 0.10, 0.20)  // C5
    trumpet(c, 659, now + 0.16, 0.10, 0.22)  // E5
    trumpet(c, 784, now + 0.27, 0.14, 0.25)  // G5

    const s = 0.45  // start of main phrase

    // ─── Trumpet 1 (lead) — mariachi fanfare: arpeggio up → turn → cadence up
    const lead = [
      { f: 523,  t: 0.00, d: 0.14 }, // C5
      { f: 659,  t: 0.14, d: 0.14 }, // E5
      { f: 784,  t: 0.28, d: 0.14 }, // G5
      { f: 1047, t: 0.42, d: 0.30 }, // C6 (accent)
      { f: 880,  t: 0.75, d: 0.14 }, // A5
      { f: 784,  t: 0.89, d: 0.14 }, // G5
      { f: 659,  t: 1.03, d: 0.14 }, // E5
      { f: 587,  t: 1.17, d: 0.14 }, // D5
      { f: 659,  t: 1.31, d: 0.14 }, // E5
      { f: 784,  t: 1.45, d: 0.14 }, // G5
      { f: 1047, t: 1.59, d: 0.65 }, // C6 (held with vibrato)
    ]
    lead.forEach(n => trumpet(c, n.f, now + s + n.t, n.d, 0.22))

    // ─── Trumpet 2 (harmony a third below) — classic mariachi doubling
    const harmony = [
      { f: 330, t: 0.00, d: 0.14 }, // E4
      { f: 392, t: 0.14, d: 0.14 }, // G4
      { f: 523, t: 0.28, d: 0.14 }, // C5
      { f: 659, t: 0.42, d: 0.30 }, // E5
      { f: 523, t: 0.75, d: 0.14 }, // C5
      { f: 494, t: 0.89, d: 0.14 }, // B4
      { f: 440, t: 1.03, d: 0.14 }, // A4
      { f: 392, t: 1.17, d: 0.14 }, // G4
      { f: 440, t: 1.31, d: 0.14 }, // A4
      { f: 523, t: 1.45, d: 0.14 }, // C5
      { f: 659, t: 1.59, d: 0.65 }, // E5
    ]
    harmony.forEach(n => trumpet(c, n.f, now + s + n.t, n.d, 0.13))

    // ─── Guitarrón bass — root/fifth walking pattern in C
    const bass = [
      { f: 130.81, t: 0.00, d: 0.24 }, // C3 (I)
      { f: 196.00, t: 0.28, d: 0.20 }, // G3 (V)
      { f: 130.81, t: 0.56, d: 0.20 }, // C3
      { f: 196.00, t: 0.84, d: 0.20 }, // G3
      { f: 174.61, t: 1.12, d: 0.20 }, // F3 (IV — subdominant colour)
      { f: 196.00, t: 1.40, d: 0.20 }, // G3
      { f: 130.81, t: 1.60, d: 0.65 }, // C3 landing
    ]
    bass.forEach(b => guitarron(c, b.f, now + s + b.t, b.d, 0.34))

    // ─── Vihuela off-beat strums (upstrokes on the 'and' of each beat)
    // I / V alternation matching the bass
    const chordC = [261.63, 329.63, 392.00, 523.25]                    // C E G C
    const chordG = [246.94, 293.66, 392.00, 493.88]                    // B D G B
    const chordF = [261.63, 349.23, 440.00, 523.25]                    // C F A C
    const strums: Array<{ t: number; ch: number[] }> = [
      { t: 0.14, ch: chordC },
      { t: 0.42, ch: chordG },
      { t: 0.70, ch: chordC },
      { t: 0.98, ch: chordG },
      { t: 1.26, ch: chordF },
      { t: 1.54, ch: chordG },
    ]
    strums.forEach(x => vihuelaStrum(c, x.ch, now + s + x.t, 0.14))

    // ─── Claves on the back-beats
    const claveTimes = [0.14, 0.42, 0.70, 0.98, 1.26, 1.54, 1.82, 2.10]
    claveTimes.forEach(t => claves(c, now + s + t, 0.14))

    // ─── Final "¡Olé!" stab — big tonic chord + low root + a couple of shakers
    const stabT = s + 2.25
    // Full C major chord across three octaves
    ;[261.63, 329.63, 392.00, 523.25, 659.25, 784.00, 1046.50].forEach((f, i) =>
      trumpet(c, f, now + stabT, 0.65, 0.14 + (i === 6 ? 0.10 : 0)))
    guitarron(c, 65.41, now + stabT, 0.7, 0.35)  // C2 — very low
    guitarron(c, 130.81, now + stabT, 0.7, 0.30) // C3
    vihuelaStrum(c, chordC, now + stabT, 0.20)
    claves(c, now + stabT + 0.08, 0.18)
    airBurst(c, now + stabT, 0.55, 0.12)
  } catch { /* ignore */ }
}
