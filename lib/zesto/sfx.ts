let ctx: AudioContext | null = null

function audio() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.12) {
  const ac = audio()
  if (!ac) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ac.currentTime + start)
  g.gain.setValueAtTime(0.0001, ac.currentTime + start)
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration)
  osc.connect(g).connect(ac.destination)
  osc.start(ac.currentTime + start)
  osc.stop(ac.currentTime + start + duration + 0.05)
}

function noiseBurst(start: number, duration: number, gain = 0.18) {
  const ac = audio()
  if (!ac) return
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * duration), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 900
  const g = ac.createGain()
  g.gain.value = gain
  src.connect(filter).connect(g).connect(ac.destination)
  src.start(ac.currentTime + start)
}

export const sfx = {
  tap() {
    tone(660, 0, 0.08, 'triangle', 0.06)
  },
  dig() {
    noiseBurst(0, 0.18)
    noiseBurst(0.22, 0.18)
    noiseBurst(0.44, 0.2)
  },
  reveal(tier: number) {
    const notes = [523, 659, 784, 1046, 1318]
    for (let i = 0; i <= Math.min(tier + 1, notes.length - 1); i++) {
      tone(notes[i], i * 0.09, 0.4, 'triangle', 0.09)
    }
    if (tier >= 3) tone(1568, 0.5, 0.8, 'sine', 0.07)
  },
  error() {
    tone(220, 0, 0.18, 'sawtooth', 0.05)
    tone(180, 0.15, 0.22, 'sawtooth', 0.05)
  },
}
