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

function noise(c: AudioContext, t: number, duration: number, vol: number, freq: number) {
  const len = Math.floor(c.sampleRate * duration)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.3))
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = 1.5
  const gain = c.createGain()
  gain.gain.value = vol
  src.connect(filter)
  filter.connect(gain)
  gain.connect(c.destination)
  src.start(t)
}

function tone(c: AudioContext, freq: number, t: number, duration: number, vol: number, type: OscillatorType = 'sine') {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.start(t)
  osc.stop(t + duration)
}

export function playWin() {
  const c = getCtx()
  if (!c) return
  try {
    const now = c.currentTime

    // Kick drum hit
    noise(c, now, 0.12, 0.8, 80)
    tone(c, 80, now, 0.25, 0.6, 'sine')

    // Snare
    noise(c, now + 0.08, 0.1, 0.5, 3000)

    // Ascending fanfare — melody
    const melody = [392, 523, 659, 784, 1047, 1319, 1047, 784, 1047, 1319]
    const times =  [0.18, 0.30, 0.42, 0.54, 0.66, 0.82, 1.00, 1.12, 1.22, 1.35]
    const durs =   [0.18, 0.18, 0.18, 0.18, 0.22, 0.30, 0.18, 0.18, 0.18, 1.20]
    melody.forEach((freq, i) => tone(c, freq, now + times[i], durs[i], 0.22))

    // Harmony layer (thirds below melody, softer)
    const harmony = [311, 392, 523, 659, 784, 1047, 784, 659, 784, 1047]
    harmony.forEach((freq, i) => tone(c, freq, now + times[i], durs[i], 0.10))

    // Bass notes
    tone(c, 130, now + 0.18, 0.5, 0.35, 'triangle')
    tone(c, 196, now + 0.66, 0.5, 0.35, 'triangle')
    tone(c, 261, now + 1.35, 1.5, 0.30, 'triangle')

    // Final chord burst (C major) at the end
    ;[523, 659, 784, 1047].forEach((f: number) => tone(c, f, now + 1.35, 1.5, 0.12))

    // Extra percussion on the beat
    noise(c, now + 0.54, 0.1, 0.4, 3000)
    noise(c, now + 1.35, 0.15, 0.7, 80)
    noise(c, now + 1.35, 0.1, 0.5, 3000)
  } catch { /* ignore */ }
}
