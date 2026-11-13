import type { Howl } from 'howler'
import sprites from './sprites.json'

type HowlerModule = typeof import('howler')
let howler: HowlerModule | null = null
let loading: Promise<HowlerModule> | null = null

/**
 * Howler is loaded on demand: starting it probes every audio codec, which costs a noticeable
 * moment on phones, and most visits never turn sound on.
 */
function loadHowler() {
  loading ??= import('howler').then((m) => (howler = m))
  return loading
}

export type UiSound = keyof typeof sprites
/** [start, length] in ms within sprites.webm (shared with scripts/generate-audio.mjs) */
const spriteMap = sprites as unknown as Record<UiSound, [number, number]>
export type SoundName = UiSound | 'transition' | 'enter'

const src = (name: string) => [`/audio/${name}.webm`, `/audio/${name}.mp3`]

const VOLUME = {
  ambient: 0.32,
  hover: 0.16,
  click: 0.3,
  toggle: 0.32,
  transition: 0.3,
  enter: 0.5,
} satisfies Record<SoundName | 'ambient', number>

/** Ambient fade-in and fade-out, ms */
const FADE_IN = 2000
const FADE_OUT = 700
/** Master fade when the window loses or regains focus, seconds (time constant) */
const FOCUS_FADE = 0.08
/** Hover sounds closer together than this are skipped, ms */
const HOVER_GAP = 70
/** One whoosh per change (a page change can also reset the scene), ms */
const TRANSITION_GAP = 500

/**
 * Howler wrapper: an ambient loop that fades in when sound is on, sprite sounds for hover,
 * click and toggle, a whoosh on hero scene changes and a chime on entry. Nothing downloads
 * until the visitor turns sound on. Everything is muted while the window is out of focus or
 * the tab is hidden. Works without WebGL (it lives beside the 3D layer, not inside it).
 *
 * An AnalyserNode on Howler's master output feeds the header visualiser.
 */
export class Sound {
  /** Visitor wants sound (store.sound, once past the entry gate) */
  enabled = false

  private ambient: Howl | null = null
  private ui: Howl | null = null
  private transition: Howl | null = null
  private chime: Howl | null = null
  private focused = true
  private lastHover = 0
  private lastTransition = -Infinity
  private tap: AnalyserNode | null = null
  /** The entry chime was asked for while Howler was still loading */
  private pendingChime = false

  constructor() {
    this.focused = document.hasFocus() && !document.hidden
    window.addEventListener('blur', this.onFocusChange)
    window.addEventListener('focus', this.onFocusChange)
    document.addEventListener('visibilitychange', this.onFocusChange)
  }

  /** The visualiser's tap on the master output (null until audio has started) */
  get analyser() {
    this.connectAnalyser()
    return this.tap
  }

  /** Fetches Howler ahead of time (when the entry gate shows), so sound starts instantly */
  preload() {
    void loadHowler().catch(() => {})
  }

  /**
   * Starts sound that was turned on before the visitor had interacted with the page (a saved
   * "sound on"). Call from the first click or key press: browsers only allow audio after one.
   */
  unlock() {
    if (this.enabled) this.start()
  }

  enable() {
    if (this.enabled) return
    this.enabled = true
    // Without a gesture yet, creating the audio context would only be blocked (and warned
    // about); unlock() starts it on the first click or key press instead
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
    this.start()
  }

  private start() {
    if (!howler) {
      void loadHowler()
        .then(() => {
          if (this.enabled) this.start()
        })
        .catch(() => {}) // audio not available: the site carries on silently
      return
    }
    try {
      this.load(howler.Howl)
      void howler.Howler.ctx?.resume()
    } catch {
      return // audio not available: the site carries on silently
    }
    if (this.pendingChime) {
      this.pendingChime = false
      this.chime?.play()
    }
    this.connectAnalyser()
    this.applyMute()
    const a = this.ambient
    if (!a) return
    if (!a.playing()) a.play()
    a.fade(a.volume(), VOLUME.ambient, FADE_IN)
  }

  disable() {
    if (!this.enabled) return
    this.enabled = false
    const a = this.ambient
    if (!a) return
    a.fade(a.volume(), 0, FADE_OUT)
    a.once('fade', () => {
      if (!this.enabled) a.pause()
    })
  }

  play(name: SoundName) {
    if (!this.enabled || !this.focused) return
    if (name === 'hover') {
      const now = performance.now()
      if (now - this.lastHover < HOVER_GAP) return
      this.lastHover = now
    }
    if (name === 'transition') {
      const now = performance.now()
      if (now - this.lastTransition < TRANSITION_GAP) return
      this.lastTransition = now
      this.transition?.play()
    } else if (name === 'enter') {
      if (this.chime) this.chime.play()
      else this.pendingChime = true
    } else {
      const id = this.ui?.play(name)
      if (id !== undefined) this.ui?.volume(VOLUME[name], id)
    }
  }

  /** Downloads the sounds the first time sound is turned on */
  private load(Howl: HowlerModule['Howl']) {
    if (this.ambient) return
    this.ambient = new Howl({ src: src('ambient-loop'), loop: true, volume: 0 })
    this.ui = new Howl({ src: src('sprites'), sprite: spriteMap })
    this.transition = new Howl({ src: src('transition'), volume: VOLUME.transition })
    this.chime = new Howl({ src: src('enter'), volume: VOLUME.enter })
  }

  /**
   * Taps the master output for the visualiser. Howler can replace its audio context (it
   * does once on the first sound, to fix a sample-rate bug on mobile), so the tap follows it.
   */
  private connectAnalyser() {
    if (!howler) return
    const { Howler } = howler
    const ctx = Howler.ctx
    if (!ctx || !Howler.masterGain || this.tap?.context === ctx) return
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 64
    analyser.smoothingTimeConstant = 0.7
    Howler.masterGain.connect(analyser)
    this.tap = analyser
  }

  private onFocusChange = () => {
    this.focused = document.hasFocus() && !document.hidden
    this.applyMute()
  }

  /** Fades the master output down while the window is out of focus, and back up after */
  private applyMute() {
    if (!howler) return
    const { Howler } = howler
    const ctx = Howler.ctx
    const gain = Howler.masterGain
    if (!ctx || !gain) return
    const target = this.focused ? 1 : 0
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setTargetAtTime(target, ctx.currentTime, FOCUS_FADE)
  }

  dispose() {
    window.removeEventListener('blur', this.onFocusChange)
    window.removeEventListener('focus', this.onFocusChange)
    document.removeEventListener('visibilitychange', this.onFocusChange)
    for (const h of [this.ambient, this.ui, this.transition, this.chime]) h?.unload()
    this.tap?.disconnect()
  }
}
