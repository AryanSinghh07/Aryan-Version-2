import { gsap } from 'gsap'
import { Color } from 'three'
import type { Theme } from '~/stores/app'
import { SCENE_COLORS } from '../config/theme'
import type { SceneColors } from '../config/theme'

type ColorKey =
  | 'background'
  | 'backgroundEnd'
  | 'glow'
  | 'particleA'
  | 'particleB'
  | 'spark'
  | 'shadowTint'
  | 'surface'
  | 'lavender'
  | 'muted'
type NumberKey =
  | 'intensity'
  | 'bloomIntensity'
  | 'bloomThreshold'
  | 'lift'
  | 'contrast'
  | 'saturation'
  | 'shadowTintAmount'
  | 'vignette'
  | 'grain'

const COLOR_KEYS: ColorKey[] = [
  'background',
  'backgroundEnd',
  'glow',
  'particleA',
  'particleB',
  'spark',
  'shadowTint',
  'surface',
  'lavender',
  'muted',
]
const NUMBER_KEYS: NumberKey[] = [
  'intensity',
  'bloomIntensity',
  'bloomThreshold',
  'lift',
  'contrast',
  'saturation',
  'shadowTintAmount',
  'vignette',
  'grain',
]

function flatten(c: SceneColors): Record<ColorKey, string> & Record<NumberKey, number> {
  return {
    background: c.background,
    backgroundEnd: c.backgroundEnd,
    glow: c.glow,
    particleA: c.particleA,
    particleB: c.particleB,
    spark: c.spark,
    shadowTint: c.grade.shadowTint,
    surface: c.surface,
    lavender: c.lavender,
    muted: c.muted,
    intensity: c.intensity,
    bloomIntensity: c.bloom.intensity,
    bloomThreshold: c.bloom.threshold,
    lift: c.grade.lift,
    contrast: c.grade.contrast,
    saturation: c.grade.saturation,
    shadowTintAmount: c.grade.shadowTintAmount,
    vignette: c.vignette,
    grain: c.grain,
  }
}

/**
 * The live 3D colours and look settings. On a theme switch every value tweens from where it
 * is to the new theme with GSAP, so background, particles, fog, bloom and grade fade together.
 * Colours are linear (three.js working colour space).
 */
export class Palette {
  theme: Theme
  colors = {} as Record<ColorKey, Color>
  values = {} as Record<NumberKey, number>
  /** 0 = light, 1 = dark, tweened: used for things that switch rather than fade (blending) */
  darkness = 0

  private from = {
    colors: {} as Record<ColorKey, Color>,
    values: {} as Record<NumberKey, number>,
    darkness: 0,
  }
  private to = {
    colors: {} as Record<ColorKey, Color>,
    values: {} as Record<NumberKey, number>,
    darkness: 0,
  }
  private tween: gsap.core.Tween | null = null

  constructor(theme: Theme) {
    this.theme = theme
    for (const k of COLOR_KEYS) {
      this.colors[k] = new Color()
      this.from.colors[k] = new Color()
      this.to.colors[k] = new Color()
    }
    this.apply(theme)
  }

  /** Fades to a theme. Instant with reduced motion. */
  setTheme(theme: Theme, instant = false) {
    if (theme === this.theme) return
    this.theme = theme
    this.tween?.kill()
    if (instant) return this.apply(theme)

    for (const k of COLOR_KEYS) this.from.colors[k].copy(this.colors[k])
    for (const k of NUMBER_KEYS) this.from.values[k] = this.values[k]
    this.from.darkness = this.darkness
    this.fill(this.to, theme)

    const progress = { t: 0 }
    this.tween = gsap.to(progress, {
      t: 1,
      duration: 0.9,
      ease: 'power2.inOut',
      onUpdate: () => this.mix(progress.t),
    })
  }

  dispose() {
    this.tween?.kill()
  }

  private apply(theme: Theme) {
    this.fill(this.to, theme)
    this.mix(1)
  }

  private fill(target: Palette['to'], theme: Theme) {
    const flat = flatten(SCENE_COLORS[theme])
    for (const k of COLOR_KEYS) target.colors[k].set(flat[k])
    for (const k of NUMBER_KEYS) target.values[k] = flat[k]
    target.darkness = theme === 'dark' ? 1 : 0
  }

  private mix(t: number) {
    for (const k of COLOR_KEYS) this.colors[k].lerpColors(this.from.colors[k], this.to.colors[k], t)
    for (const k of NUMBER_KEYS) {
      const a = this.from.values[k] ?? this.to.values[k]
      this.values[k] = a + (this.to.values[k] - a) * t
    }
    this.darkness = this.from.darkness + (this.to.darkness - this.from.darkness) * t
  }
}
