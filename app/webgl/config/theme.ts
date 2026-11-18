import type { Theme } from '~/stores/app'

// 3D look per theme, from the blueprint's "3D scene colors per theme" table.
// Kept here (not in SCSS) because the WebGL code needs them as numbers. Every value here is
// tweened when the theme switches, so the 3D world fades between themes.
export interface SceneColors {
  /** Soft glow behind the particles */
  glow: string
  particleA: string
  particleB: string
  /**
   * The particle logo's three colours: most balls in the first, fewer in the second and
   * fewest in the third. Picked to work on each theme's sky (jewel tones by day, glowing
   * pastels at night).
   */
  logo: { a: string; b: string; c: string }
  spark: string
  /** Sky dome gradient, from the horizon up (from the Digital Atmosphere scene: night / pastel day) */
  sky: { horizon: string; mid: string; high: string; top: string }
  /** Distance fog over the landscape */
  fog: string
  /** Lake surface under the logo */
  lake: string
  /** Card surface, soft lavender and muted text: for media placeholders drawn in WebGL */
  surface: string
  lavender: string
  muted: string
  /** Fluid smoke tint and how strongly it covers the scene */
  fluid: string
  fluidOpacity: number
  /** Particle glow strength (dark uses additive blending, which adds up quickly) */
  intensity: number
  bloom: { intensity: number; threshold: number }
  /** Colour grade: lifted or deepened shadows, contrast, saturation, shadow tint */
  grade: {
    lift: number
    contrast: number
    saturation: number
    shadowTint: string
    shadowTintAmount: number
  }
  vignette: number
  grain: number
}

export const SCENE_COLORS: Record<Theme, SceneColors> = {
  // Soft, airy, lifted shadows
  light: {
    glow: '#e2d6ff',
    sky: { horizon: '#ffc8dc', mid: '#dcb0f2', high: '#a585ea', top: '#6c50d0' },
    fog: '#c4a8ee',
    lake: '#e6dcff',
    particleA: '#7b3ff2',
    particleB: '#c9b8ff',
    logo: { a: '#7a2df0', b: '#c84fe6', c: '#a46cff' },
    spark: '#d4ff3a',
    surface: '#ede7ff',
    lavender: '#c9b8ff',
    muted: '#6b5b8c',
    fluid: '#c9b8ff',
    fluidOpacity: 0.35,
    intensity: 1,
    // High threshold: only the brightest sparks bloom, the white background never does
    bloom: { intensity: 0.4, threshold: 0.92 },
    grade: {
      lift: 0.03,
      contrast: 0.95,
      saturation: 1.02,
      shadowTint: '#c9b8ff',
      shadowTintAmount: 0.08,
    },
    vignette: 0.12,
    grain: 0.035,
  },
  // Deep, contrasty, violet shadows
  dark: {
    glow: '#2a1550',
    sky: { horizon: '#8a4fa8', mid: '#4b2f8c', high: '#24185a', top: '#0a0720' },
    fog: '#2e2260',
    lake: '#b8a8ea',
    particleA: '#9b6bff',
    particleB: '#ede7ff',
    logo: { a: '#9b4dff', b: '#e07bff', c: '#f5ccff' },
    spark: '#d4ff3a',
    surface: '#1e1033',
    lavender: '#c9b8ff',
    muted: '#a99bc9',
    fluid: '#9b6bff',
    fluidOpacity: 0.45,
    intensity: 0.95,
    bloom: { intensity: 0.9, threshold: 0.22 },
    grade: {
      lift: 0,
      contrast: 1.05,
      saturation: 1.04,
      shadowTint: '#2a0f45',
      shadowTintAmount: 0.05,
    },
    vignette: 0.32,
    grain: 0.05,
  },
}
