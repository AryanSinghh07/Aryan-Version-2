import type { Theme } from '~/stores/app'

// 3D colours per theme, from the blueprint's "3D scene colors per theme" table.
// Kept here (not in SCSS) because the WebGL code needs them as numbers.
export interface SceneColors {
  background: string
  backgroundEnd: string
  particleA: string
  particleB: string
  spark: string
  bloom: number
  /** Particle glow strength (dark uses additive blending, which adds up quickly) */
  intensity: number
}

export const SCENE_COLORS: Record<Theme, SceneColors> = {
  light: {
    background: '#f3eeff',
    backgroundEnd: '#fbfaff',
    particleA: '#7b3ff2',
    particleB: '#c9b8ff',
    spark: '#d4ff3a',
    bloom: 0.4,
    intensity: 0.85,
  },
  dark: {
    background: '#120a1f',
    backgroundEnd: '#1e1033',
    particleA: '#9b6bff',
    particleB: '#ede7ff',
    spark: '#d4ff3a',
    bloom: 0.9,
    intensity: 0.36,
  },
}
