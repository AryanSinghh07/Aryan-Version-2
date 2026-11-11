import type { QualityTier } from '../config/quality'

const STEP_DOWN: Record<QualityTier, QualityTier | null> = {
  high: 'medium',
  medium: 'low',
  low: null,
}

/**
 * Keeps "Auto" quality smooth: if the frame rate stays under the target for a few seconds
 * (a weak GPU, or another app such as a video player sharing it), steps down one tier.
 * Only steps down, never back up, so the look doesn't flicker between tiers.
 * A visitor's own quality choice is never changed.
 */
export class PerformanceMonitor {
  /** Frames per second below which a tier counts as too heavy */
  minFps = 50
  /** How long the average is measured over before deciding, in seconds */
  window = 3
  /** Wait after start or a tier change before measuring, in seconds */
  warmup = 2

  private elapsed = 0
  private frames = 0
  private time = 0

  /** Restarts measuring (after the tier changes, or when a measurement no longer applies) */
  reset() {
    this.elapsed = 0
    this.frames = 0
    this.time = 0
  }

  /**
   * Feed one frame. Returns the tier to switch to when the current one is too heavy.
   * @param delta real seconds since the last frame
   */
  update(delta: number, tier: QualityTier): QualityTier | null {
    // A background tab or a debugger pause is not a slow frame
    if (delta > 0.25) return null
    this.elapsed += delta
    if (this.elapsed < this.warmup) return null
    this.frames++
    this.time += delta
    if (this.time < this.window) return null

    const fps = this.frames / this.time
    this.frames = 0
    this.time = 0
    if (fps >= this.minFps) return null
    this.reset()
    return STEP_DOWN[tier]
  }
}
