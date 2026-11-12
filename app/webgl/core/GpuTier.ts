import { getGPUTier } from 'detect-gpu'
import type { QualityTier } from '../config/quality'

export interface GpuResult {
  tier: QualityTier
  /** Detected GPU name, or why detection could not tell */
  gpu: string
}

/** Long enough for a slow connection to fetch one small benchmark file */
const TIMEOUT = 2500

/**
 * Picks the starting tier for "Auto" quality with detect-gpu. Its benchmark data is served
 * from /benchmarks (copied from the package on install), so no request leaves the site.
 * Desktops get a tier more than phones with the same score, because the site is tuned to run
 * High on a mid-range laptop. If detection fails, desktops start at High and phones at
 * Medium; the performance monitor still steps down from there if frames run slow.
 */
export async function detectGpuTier(
  gl: WebGLRenderingContext | WebGL2RenderingContext
): Promise<GpuResult> {
  const mobile = window.matchMedia('(pointer: coarse)').matches
  const fallback: GpuResult = { tier: mobile ? 'medium' : 'high', gpu: 'unknown' }

  try {
    const result = await Promise.race([
      getGPUTier({ glContext: gl, benchmarksURL: '/benchmarks' }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT)),
    ])
    if (!result) return { ...fallback, gpu: 'timed out' }

    const gpu = result.gpu ?? result.type
    const onMobile = result.isMobile ?? mobile
    if (result.type === 'BLOCKLISTED' || result.type === 'WEBGL_UNSUPPORTED')
      return { tier: 'low', gpu }
    if (result.type === 'FALLBACK') return { ...fallback, gpu }

    switch (result.tier) {
      case 3:
        return { tier: 'high', gpu }
      case 2:
        return { tier: onMobile ? 'medium' : 'high', gpu }
      case 1:
        return { tier: onMobile ? 'low' : 'medium', gpu }
      default:
        return { tier: 'low', gpu }
    }
  } catch {
    return { ...fallback, gpu: 'detection failed' }
  }
}
