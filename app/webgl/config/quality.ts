import type { Quality } from '~/stores/app'

// What each quality tier turns on. "auto" is resolved to a real tier by GPU detection in
// Phase 9; until then it means "high".
//
// maxPixelRatio caps the canvas resolution only. All text is HTML on top of the canvas and
// stays sharp at the screen's full resolution; the canvas holds soft particles, a gradient and
// glass, which look the same at a lower density. Measured on an Intel Iris Xe laptop with a 2x
// screen and all effects on: 2.0 → 37 fps, 1.5 → 53 fps, 1.25 → 78 fps.
export interface QualitySettings {
  maxPixelRatio: number
  particles: number
  fluid: boolean
  bloom: boolean
  /** Post-processing (grade, vignette, grain, chromatic aberration) */
  post: boolean
  /** Glass orb refracts what is behind it (an extra render of the scene each frame) */
  transmission: boolean
  /** Floating glass shards */
  shards: boolean
}

export type QualityTier = Exclude<Quality, 'auto'>

export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: {
    maxPixelRatio: 1.25,
    particles: 20_000,
    fluid: true,
    bloom: true,
    post: true,
    transmission: true,
    shards: true,
  },
  medium: {
    maxPixelRatio: 1,
    particles: 12_000,
    fluid: true,
    bloom: false,
    post: true,
    transmission: false,
    shards: true,
  },
  low: {
    maxPixelRatio: 1,
    particles: 6_000,
    fluid: false,
    bloom: false,
    post: false,
    transmission: false,
    shards: false,
  },
}

/**
 * Anti-aliasing samples for the post-processing buffer. Only on 1x screens, where jagged
 * glass edges would show; on denser screens the extra pixels already smooth them, and MSAA
 * would cost a third of the frame rate.
 */
export function msaaSamples(tier: QualityTier, pixelRatio: number) {
  return tier === 'high' && pixelRatio <= 1 ? 2 : 0
}

export function resolveQuality(quality: Quality, autoTier: QualityTier = 'high'): QualityTier {
  return quality === 'auto' ? autoTier : quality
}
