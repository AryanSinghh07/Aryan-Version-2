import type { Theme } from '~/stores/app'

// 3D look per theme, from the blueprint's "3D scene colors per theme" table.
// Kept here (not in SCSS) because the WebGL code needs them as numbers. Every value here is
// tweened when the theme switches, so the 3D world fades between themes.
export interface SceneColors {
  /** Soft glow behind the particles */
  glow: string
  particleA: string
  particleB: string
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
    sky: { horizon: '#ffd9e6', mid: '#e6c4f0', high: '#b79ae8', top: '#8a6fd8' },
    fog: '#c9b3ec',
    lake: '#a693dc',
    particleA: '#7b3ff2',
    particleB: '#c9b8ff',
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
    sky: { horizon: '#7a4f9a', mid: '#4a3480', high: '#261c52', top: '#0d0a24' },
    fog: '#33275c',
    lake: '#6c5ca8',
    particleA: '#9b6bff',
    particleB: '#ede7ff',
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
