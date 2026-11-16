import { Color, MathUtils } from 'three'

// The landscape's two looks (from the Digital Atmosphere scene): a night for dark mode and a
// bright pastel day for light mode. The World blends between them with the theme fade, so a
// theme switch cross-fades the whole world. Sky, fog colour and lake live in theme.ts with
// the rest of the palette; this holds the lights and the landscape's own materials.
// Distances are in Blender units (the landscape is scaled down to fit the site's world).
export interface LandscapeLook {
  fogNear: number
  fogFar: number
  ambient: string
  ambientI: number
  hemiSky: string
  hemiGround: string
  hemiI: number
  sun: string
  sunI: number
  grass: string
  cloud: string
  cloudEmissive: number
  particleGlow: number
  starGlow: number
  /** Point lights at Blender strength (scaled with the landscape when applied) */
  lampI: number
  lighthouseI: number
  beam: number
}

export const LANDSCAPE_LOOKS: { dark: LandscapeLook; light: LandscapeLook } = {
  // Night: deep violet, moonlight, the lamp and lighthouse glow
  dark: {
    fogNear: 40,
    fogFar: 260,
    ambient: '#8a74c8',
    ambientI: 0.45,
    hemiSky: '#9b86d9',
    hemiGround: '#120c26',
    hemiI: 0.6,
    sun: '#b9a2ff',
    sunI: 0.7,
    grass: '#5b3aa0',
    cloud: '#8d78c4',
    cloudEmissive: 0.15,
    particleGlow: 4,
    starGlow: 40,
    lampI: 10,
    lighthouseI: 45,
    beam: 0.75,
  },
  // Day: bright pastel, warm sun, saturated, almost no glow
  light: {
    fogNear: 70,
    fogFar: 420,
    ambient: '#fff1fa',
    ambientI: 0.55,
    hemiSky: '#ffe6f4',
    hemiGround: '#4a3478',
    hemiI: 0.9,
    sun: '#fff0e0',
    sunI: 2.4,
    grass: '#8a55d6',
    cloud: '#ffffff',
    cloudEmissive: 0.6,
    particleGlow: 0.8,
    starGlow: 6,
    lampI: 2,
    lighthouseI: 8,
    beam: 0.18,
  },
}

type ColorKey = { [K in keyof LandscapeLook]: LandscapeLook[K] extends string ? K : never }[keyof LandscapeLook]
type NumberKey = Exclude<keyof LandscapeLook, ColorKey>

const tmp = new Color()

/** Blends a colour between the looks; darkness 1 = night, 0 = day */
export function lookColor(key: ColorKey, darkness: number, out: Color) {
  return out.set(LANDSCAPE_LOOKS.light[key]).lerp(tmp.set(LANDSCAPE_LOOKS.dark[key]), darkness)
}

/** Blends a number between the looks; darkness 1 = night, 0 = day */
export function lookNumber(key: NumberKey, darkness: number) {
  return MathUtils.lerp(LANDSCAPE_LOOKS.light[key], LANDSCAPE_LOOKS.dark[key], darkness)
}
