import type { QualityTier } from '~/stores/app'

// What each quality tier turns on. "Auto" starts from the tier GPU detection picks
// (core/GpuTier.ts) and steps down if frames run slow (core/PerformanceMonitor.ts).
//
// maxPixelRatio caps the canvas resolution only. All text is HTML on top of the canvas and
// stays sharp at the screen's full resolution; the canvas holds soft particles, a gradient and
// glass, which look the same at a lower density. Measured on an Intel Iris Xe laptop with a 2x
// screen and all effects on: 2.0 → 37 fps, 1.5 → 53 fps, 1.25 → 78 fps.
export interface QualitySettings {
  maxPixelRatio: number
  /** Particle simulation texture size: size × size particles, simulated on the GPU */
  simSize: number
  /** simSize², kept for the parts of the code that think in particle counts */
  particles: number
  /** Drifting sparkles and glowing fireflies in the world */
  sparkles: number
  fireflies: number
  /** Floor: a real reflection, a glossy floor without one, or none */
  floor: 'reflect' | 'gloss' | 'none'
  fluid: boolean
  bloom: boolean
  /** Post-processing (grade, vignette, grain, chromatic aberration) */
  post: boolean
  /** Glass orb refracts what is behind it (an extra render of the scene each frame) */
  transmission: boolean
  /** Floating glass shards */
  shards: boolean
}

export type { QualityTier }

export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: {
    maxPixelRatio: 1.25,
    simSize: 180,
    particles: 180 * 180,
    sparkles: 2000,
    fireflies: 90,
    floor: 'reflect',
    fluid: true,
    bloom: true,
    post: true,
    transmission: true,
    shards: true,
  },
  medium: {
    maxPixelRatio: 1,
    simSize: 128,
    particles: 128 * 128,
    sparkles: 1000,
    fireflies: 50,
    floor: 'gloss',
    fluid: true,
    bloom: false,
    post: true,
    transmission: false,
    shards: true,
  },
  low: {
    maxPixelRatio: 1,
    simSize: 96,
    particles: 96 * 96,
    sparkles: 500,
    fireflies: 0,
    floor: 'gloss',
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

export function resolveQuality(
  quality: QualityTier | 'auto',
  autoTier: QualityTier = 'high'
): QualityTier {
  return quality === 'auto' ? autoTier : quality
}
