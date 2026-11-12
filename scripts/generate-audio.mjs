// Synthesises the site's sounds from scratch (no samples, so nothing to license or credit)
// and encodes them to WebM (Opus) with an MP3 fallback in public/audio/.
//
//   node scripts/generate-audio.mjs            needs ffmpeg on PATH, or FFMPEG=/path/to/ffmpeg
//   node scripts/generate-audio.mjs --wav      writes .wav files only
//
// To use your own recordings instead, replace the files in public/audio/ with the same names.
// The sprite sheet layout (start and length of each sound, in ms) is in
// app/webgl/audio/sprites.json and is shared with the site.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const RATE = 48_000
const OUT = 'public/audio'
const SPRITES = JSON.parse(readFileSync('app/webgl/audio/sprites.json', 'utf8'))
const wavOnly = process.argv.includes('--wav')

// ---------------------------------------------------------------------------------------------
// Small DSP kit

let seed = 7
function random() {
  // mulberry32: the same sounds on every run
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const TAU = Math.PI * 2
const note = (midi) => 440 * 2 ** ((midi - 69) / 12)
const buffer = (seconds) => [
  new Float32Array(Math.ceil(seconds * RATE)),
  new Float32Array(Math.ceil(seconds * RATE)),
]

/** Topology-preserving state-variable filter (Simper). Returns { low, band, high }. */
function svf() {
  let ic1 = 0
  let ic2 = 0
  return (x, cutoff, q = 0.707) => {
    const g = Math.tan((Math.PI * Math.min(cutoff, RATE * 0.45)) / RATE)
    const k = 1 / q
    const a1 = 1 / (1 + g * (g + k))
    const a2 = g * a1
    const a3 = g * a2
    const v3 = x - ic2
    const v1 = a1 * ic1 + a2 * v3
    const v2 = ic2 + a2 * ic1 + a3 * v3
    ic1 = 2 * v1 - ic1
    ic2 = 2 * v2 - ic2
    return { low: v2, band: v1, high: x - k * v1 - v2 }
  }
}

/** Adds a decaying bell (inharmonic partials) into a stereo buffer */
function bell(
  out,
  start,
  freq,
  {
    gain = 0.2,
    decay = 1.2,
    pan = 0,
    partials = [
      [1, 1, 1],
      [2.76, 0.35, 0.45],
      [5.4, 0.12, 0.25],
      [8.93, 0.05, 0.15],
    ],
  } = {}
) {
  const [l, r] = out
  const s0 = Math.floor(start * RATE)
  const length = Math.min(l.length - s0, Math.ceil(decay * 6 * RATE))
  const pl = Math.cos(((pan + 1) * Math.PI) / 4)
  const pr = Math.sin(((pan + 1) * Math.PI) / 4)
  for (let i = 0; i < length; i++) {
    const t = i / RATE
    const attack = Math.min(t / 0.004, 1)
    let v = 0
    for (const [ratio, amp, d] of partials)
      v += Math.sin(TAU * freq * ratio * t) * amp * Math.exp(-t / (decay * d))
    v *= gain * attack
    l[s0 + i] += v * pl
    r[s0 + i] += v * pr
  }
}

function normalise(channels, peak) {
  let max = 0
  for (const c of channels) for (const v of c) max = Math.max(max, Math.abs(v))
  const k = max ? peak / max : 1
  for (const c of channels) for (let i = 0; i < c.length; i++) c[i] *= k
}

/** Short fades at both ends so nothing starts or stops with a click */
function edgeFade(channels, ms = 4) {
  const n = Math.floor((ms / 1000) * RATE)
  for (const c of channels) {
    for (let i = 0; i < n && i < c.length; i++) {
      c[i] *= i / n
      c[c.length - 1 - i] *= i / n
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Ambient loop: a slow, soft synth pad moving through four chords, with a quiet breath of
// noise and the odd bell. 60 s, seamless: an extra tail is rendered and cross-faded onto the
// start, so the end flows straight back into the beginning.

function ambient() {
  const LENGTH = 60
  const TAIL = 4
  const [l, r] = buffer(LENGTH + TAIL)
  const CHORD = LENGTH / 4
  const chords = [
    [41, 57, 60, 64, 67], // Fmaj9
    [38, 53, 57, 60, 64], // Dm9
    [34, 53, 57, 62, 64], // Bbmaj9(#11) colour
    [36, 55, 60, 62, 67], // Csus2
  ]

  // Each chord swells in and out on a Hann window twice the chord length, so neighbouring
  // chords cross-fade and the weights always add up to 1. The windows repeat every LENGTH
  // seconds, so the tail matches the start.
  const windowAt = (t, index) => {
    let d = (((t - (index + 0.5) * CHORD) % LENGTH) + LENGTH) % LENGTH
    if (d > LENGTH / 2) d -= LENGTH
    return Math.abs(d) >= CHORD ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * d) / CHORD)
  }

  const voices = []
  chords.forEach((chord, ci) => {
    chord.forEach((midi, ni) => {
      for (const cents of [-5, 0, 6]) {
        voices.push({
          chord: ci,
          freq: note(midi) * 2 ** (cents / 1200),
          phase: random() * TAU,
          gain: (ni === 0 ? 0.9 : 0.45) / 3,
          pan: ni === 0 ? 0 : (random() * 2 - 1) * 0.7,
          lfo: 0.05 + random() * 0.08,
          lfoPhase: random() * TAU,
        })
      }
    })
  })

  const filterL = svf()
  const filterR = svf()
  const airL = svf()
  const airR = svf()

  for (let i = 0; i < l.length; i++) {
    const t = i / RATE
    const weights = chords.map((_, ci) => windowAt(t, ci))
    let sl = 0
    let sr = 0
    for (const v of voices) {
      const w = weights[v.chord]
      if (w < 1e-4) continue
      const x = TAU * v.freq * t + v.phase
      // A soft, slightly hollow tone: fundamental plus a little 2nd and 3rd harmonic
      const tone = Math.sin(x) + 0.22 * Math.sin(2 * x) + 0.09 * Math.sin(3 * x)
      const swell = 0.75 + 0.25 * Math.sin(TAU * v.lfo * t + v.lfoPhase)
      const s = tone * v.gain * w * swell
      sl += s * (0.5 - v.pan * 0.5)
      sr += s * (0.5 + v.pan * 0.5)
    }
    // The low-pass breathes open and closed (period 20 s, so it also loops)
    const cutoff = 1100 + 600 * Math.sin((TAU * t) / 20)
    sl = filterL(sl, cutoff, 0.8).low
    sr = filterR(sr, cutoff, 0.8).low
    // Breath of air: band-passed noise
    const nl = airL(random() * 2 - 1, 2400, 0.6).band
    const nr = airR(random() * 2 - 1, 2600, 0.6).band
    const air = 0.012 * (0.6 + 0.4 * Math.sin((TAU * t) / 15))
    l[i] = sl + nl * air
    r[i] = sr + nr * air
  }

  // Sparse bells from the chord tones, two octaves up, with a soft echo
  const bells = [
    [3.2, 76, -0.4],
    [9.6, 72, 0.3],
    [17.8, 69, 0.5],
    [24.1, 74, -0.2],
    [33.5, 69, -0.5],
    [39.9, 76, 0.4],
    [48.4, 72, 0.1],
    [54.7, 79, -0.3],
  ]
  for (const [time, midi, pan] of bells) {
    for (const [delay, level] of [
      [0, 1],
      [0.38, 0.35],
      [0.76, 0.12],
    ]) {
      const at = time + delay
      // Wrap echoes that run past the end into the tail region, which is folded onto the start
      bell([l, r], at, note(midi), { gain: 0.05 * level, decay: 1.6, pan: delay ? -pan : pan })
    }
  }

  // Fold the tail onto the start with an equal-power cross-fade
  const n = LENGTH * RATE
  const x = TAIL * RATE
  const outL = l.slice(0, n)
  const outR = r.slice(0, n)
  for (let i = 0; i < x; i++) {
    const a = Math.sin(((i / x) * Math.PI) / 2)
    const b = Math.cos(((i / x) * Math.PI) / 2)
    outL[i] = l[i] * a + l[n + i] * b
    outR[i] = r[i] * a + r[n + i] * b
  }
  normalise([outL, outR], 0.7)
  return [outL, outR]
}

// ---------------------------------------------------------------------------------------------
// UI sprites, one sheet. Positions come from sprites.json.

function hover(out, s0) {
  const [l, r] = out
  const len = 0.1 * RATE
  for (let i = 0; i < len; i++) {
    const t = i / RATE
    const f = 2300 - 400 * Math.min(t / 0.05, 1)
    const v =
      (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 1.5 * t)) *
      Math.exp(-t / 0.014) *
      Math.min(t / 0.002, 1)
    l[s0 + i] += v * 0.22
    r[s0 + i] += v * 0.22
  }
}

function click(out, s0) {
  const [l, r] = out
  const len = 0.18 * RATE
  const noise = svf()
  for (let i = 0; i < len; i++) {
    const t = i / RATE
    const f = 620 + 380 * Math.exp(-t / 0.02)
    const body = Math.sin(TAU * f * t) * Math.exp(-t / 0.04)
    const tick = noise(random() * 2 - 1, 3500, 1.2).band * Math.exp(-t / 0.003)
    const v = (body * 0.5 + tick * 0.6) * Math.min(t / 0.001, 1)
    l[s0 + i] += v * 0.5
    r[s0 + i] += v * 0.5
  }
}

function toggle(out, s0) {
  bell(out, s0 / RATE, note(81), { gain: 0.16, decay: 0.08, pan: -0.15 })
  bell(out, s0 / RATE + 0.06, note(88), { gain: 0.14, decay: 0.12, pan: 0.15 })
}

function sprites() {
  const end = Math.max(...Object.values(SPRITES).map(([start, length]) => start + length))
  const out = buffer(end / 1000 + 0.05)
  hover(out, Math.floor((SPRITES.hover[0] / 1000) * RATE))
  click(out, Math.floor((SPRITES.click[0] / 1000) * RATE))
  toggle(out, Math.floor((SPRITES.toggle[0] / 1000) * RATE))
  // Silence each slot's end so one sound can never bleed into the next
  for (const [start, length] of Object.values(SPRITES)) {
    const fade = Math.floor(0.012 * RATE)
    const stop = Math.floor(((start + length) / 1000) * RATE)
    for (const c of out) {
      for (let i = 0; i < fade; i++) c[stop - fade + i] *= 1 - i / fade
      const next = Math.min(
        ...Object.values(SPRITES)
          .map(([s]) => s)
          .filter((s) => s > start),
        Infinity
      )
      const until = Number.isFinite(next) ? Math.floor((next / 1000) * RATE) : c.length
      c.fill(0, stop, until)
    }
  }
  normalise(out, 0.8)
  return out
}

// ---------------------------------------------------------------------------------------------
// Scene-change whoosh: noise through a resonant band-pass sweeping up and back down,
// travelling from left to right.

function transition() {
  const DURATION = 1.1
  const [l, r] = buffer(DURATION)
  const fl = svf()
  const fr = svf()
  for (let i = 0; i < l.length; i++) {
    const t = i / RATE
    const p = t / DURATION
    const env = Math.sin(Math.PI * p) ** 2 * Math.exp(-p * 0.8)
    const cutoff = 280 * 2 ** (3.6 * Math.sin(Math.PI * Math.min(p * 1.15, 1)))
    const n = random() * 2 - 1
    const vl = fl(n, cutoff, 2.2).band
    const vr = fr(n, cutoff * 1.04, 2.2).band
    const pan = p * 2 - 1
    l[i] = vl * env * (0.5 - pan * 0.4)
    r[i] = vr * env * (0.5 + pan * 0.4)
  }
  normalise([l, r], 0.6)
  edgeFade([l, r])
  return [l, r]
}

// ---------------------------------------------------------------------------------------------
// Entry chime: an Fmaj9 arpeggio of bells over a soft low swell.

function enter() {
  const DURATION = 2.4
  const out = buffer(DURATION)
  ;[77, 81, 84, 88, 91].forEach((midi, i) => {
    bell(out, 0.02 + i * 0.075, note(midi), { gain: 0.16, decay: 0.9, pan: -0.5 + i * 0.25 })
  })
  const [l, r] = out
  for (let i = 0; i < l.length; i++) {
    const t = i / RATE
    const env = Math.min(t / 0.25, 1) * Math.exp(-t / 0.9)
    const v = (Math.sin(TAU * note(53) * t) + 0.3 * Math.sin(TAU * note(60) * t)) * env * 0.12
    l[i] += v
    r[i] += v
  }
  normalise(out, 0.75)
  edgeFade(out)
  return out
}

// ---------------------------------------------------------------------------------------------
// Output

function wav(channels) {
  const frames = channels[0].length
  const data = Buffer.alloc(frames * channels.length * 2)
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels.length; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]))
      data.writeInt16LE(Math.round(v * 32767), (i * channels.length + c) * 2)
    }
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels.length, 22)
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * channels.length * 2, 28)
  header.writeUInt16LE(channels.length * 2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

const sounds = {
  'ambient-loop': { render: ambient, opus: '80k', mp3: '112k' },
  sprites: { render: sprites, opus: '64k', mp3: '96k' },
  transition: { render: transition, opus: '64k', mp3: '96k' },
  enter: { render: enter, opus: '64k', mp3: '96k' },
}

mkdirSync(OUT, { recursive: true })
const ffmpeg = process.env.FFMPEG || 'ffmpeg'

for (const [name, { render, opus, mp3 }] of Object.entries(sounds)) {
  const file = join(OUT, `${name}.wav`)
  writeFileSync(file, wav(render()))
  if (!wavOnly) {
    const run = (args) =>
      execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, ...args])
    run(['-c:a', 'libopus', '-b:a', opus, join(OUT, `${name}.webm`)])
    run(['-c:a', 'libmp3lame', '-b:a', mp3, join(OUT, `${name}.mp3`)])
    rmSync(file)
  }
  console.log(`audio: ${name}`)
}
