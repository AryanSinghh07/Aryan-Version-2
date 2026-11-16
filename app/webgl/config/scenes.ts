// Where the particles sit and where the camera looks, per scene and per page.
// Which shape each scene shows comes from content (profile.json heroScenes, about.json scenes:
// particleShape), so changing a shape there needs no code change.

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

export interface Orbit {
  /** Around the vertical axis, degrees (0 = straight in front) */
  angle: number
  height: number
  distance: number
}

/**
 * Camera orbit per full-screen scene: each scene change swings the camera around the logo,
 * so the landscape appears to turn while the logo stays in place. Angles are picked so the
 * lighthouse and the blossom tree never stand behind the text: text on the right (scenes 1
 * and 3) looks past the tree with the lighthouse out of frame; text on the left (2 and 4)
 * puts the lighthouse or the tree beside the logo; the closing scene looks over the lake to
 * the tree and the fox. Cycles if there are more scenes.
 */
export const SCENE_ORBITS: Orbit[] = [
  { angle: 0, height: 0.35, distance: 8.4 },
  { angle: 120, height: 0.75, distance: 8.3 },
  { angle: 40, height: 0.3, distance: 8.6 },
  { angle: 190, height: 0.9, distance: 8.3 },
  { angle: -15, height: 0.5, distance: 8.7 },
]

/** The logo turns to face the camera by this share of the orbit angle, so it always reads */
export const LOGO_FOLLOW = 0.85

/** Floor height (just below the logo) */
export const FLOOR_Y = -2.4

/** Inner pages: a soft constellation off to the side, out of the way of the text */
export const PAGE_SHAPE = 'constellation'
export const PAGE_LAYOUT: Layout = { x: 2.3, y: 0, scale: 0.9, opacity: 0.35 }
export const PAGE_LAYOUT_PORTRAIT: Layout = { x: 0, y: 0.6, scale: 0.6, opacity: 0.25 }
export const PAGE_CAMERA: [number, number, number] = [0, 0, 8.4]

export interface PageView {
  camera: [number, number, number]
  layout: Layout
}

/**
 * Each inner page has its own camera angle and particle placement, so a page change moves
 * the camera through the same 3D world. Phones always use PAGE_LAYOUT_PORTRAIT.
 */
const PAGE_VIEWS: { match: (route: string) => boolean; view: PageView }[] = [
  {
    // Case study: higher and further back; the project's own shape is a little stronger
    match: (r) => r.startsWith('/work/'),
    view: { camera: [0, 0.9, 9.6], layout: { x: 2.4, y: 0.7, scale: 0.62, opacity: 0.4 } },
  },
  {
    // Work: straight on at the carousel ring; the constellation floats above as a soft void
    match: (r) => r === '/work',
    view: { camera: [0, 0.3, 9], layout: { x: 0, y: 2.4, scale: 1.3, opacity: 0.3 } },
  },
  {
    // Contact: closer and from below, the constellation leaning in
    match: (r) => r === '/contact',
    view: { camera: [1.4, -0.5, 7.6], layout: { x: 2.4, y: -0.2, scale: 1.05, opacity: 0.4 } },
  },
]

export function pageView(route: string): PageView {
  return (
    PAGE_VIEWS.find((p) => p.match(route))?.view ?? { camera: PAGE_CAMERA, layout: PAGE_LAYOUT }
  )
}

/** Shown while loading and behind the entry gate, before the first shape forms */
export const INTRO_CLOUD_RADIUS = 3.6
