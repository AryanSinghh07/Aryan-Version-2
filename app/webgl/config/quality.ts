import type { Quality } from '~/stores/app'

// What each quality tier turns on. "auto" is resolved to a real tier by GPU detection in
// Phase 9; until then it means "high".
export interface QualitySettings {
  maxPixelRatio: number
  particles: number
  fluid: boolean
  bloom: boolean
}

export type QualityTier = Exclude<Quality, 'auto'>

export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: { maxPixelRatio: 2, particles: 20_000, fluid: true, bloom: true },
  medium: { maxPixelRatio: 1.5, particles: 12_000, fluid: true, bloom: false },
  low: { maxPixelRatio: 1, particles: 6_000, fluid: false, bloom: false },
}

export function resolveQuality(quality: Quality, autoTier: QualityTier = 'high'): QualityTier {
  return quality === 'auto' ? autoTier : quality
}
