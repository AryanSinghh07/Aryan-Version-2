// Where the particles sit and where the camera looks, per hero scene and per page.
// Which shape each hero scene shows comes from content/profile.json (heroScenes[].particleShape),
// so changing a shape there needs no code change.

export type TextSide = 'left' | 'right' | 'center'

export interface HeroSceneInfo {
  shape: string
  side: TextSide
}

export interface Layout {
  /** Particle group offset in world units */
  x: number
  y: number
  scale: number
  opacity: number
}

/** Particles sit opposite the text: text on the right puts particles on the left */
export function layoutFor(side: TextSide, portrait: boolean): Layout {
  if (portrait) {
    // Phones: in the empty space above the text, smaller and softer
    return { x: 0, y: 1.45, scale: 0.42, opacity: side === 'center' ? 0.35 : 0.55 }
  }
  if (side === 'center') return { x: 0, y: 0, scale: 1.1, opacity: 0.4 }
  // Sides: kept clear of the centre line so shapes never run into the headline
  return { x: side === 'right' ? -2.15 : 2.15, y: 0, scale: 0.78, opacity: 1 }
}

/** Camera position per hero scene (looks at the origin). Cycles if there are more scenes. */
export const SCENE_CAMERAS: [number, number, number][] = [
  [0, 0, 8.4],
  [0.5, 0.3, 8.2],
  [-0.4, -0.2, 8.5],
  [0.45, -0.25, 8.3],
  [0, 0.15, 8.8],
]

/** Inner pages: a soft constellation off to the side, out of the way of the text */
export const PAGE_SHAPE = 'constellation'
export const PAGE_LAYOUT: Layout = { x: 2.3, y: 0, scale: 0.9, opacity: 0.35 }
export const PAGE_LAYOUT_PORTRAIT: Layout = { x: 0, y: 0.6, scale: 0.6, opacity: 0.25 }
export const PAGE_CAMERA: [number, number, number] = [0, 0, 8.4]

/** Shown while loading and behind the entry gate, before the first shape forms */
export const INTRO_CLOUD_RADIUS = 3.6
