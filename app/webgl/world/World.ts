import { gsap } from 'gsap'
import { Fog, MathUtils, Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { QUALITY } from '../config/quality'
import type { QualityTier } from '../config/quality'
import {
  LOGO_FOLLOW,
  PAGE_LAYOUT_PORTRAIT,
  PAGE_SHAPE,
  SCENE_ORBITS,
  layoutFor,
  pageView,
} from '../config/scenes'
import type { Layout } from '../config/scenes'
import type { Palette } from '../core/Palette'
import type { Resources } from '../core/Resources'
import type { FrameState } from '../Experience'

import { FALLBACK_SHAPE, ShapeLibrary } from '../shapes/ShapeLibrary'
import { Carousel } from './Carousel'
import { Environment } from './Environment'
import { lookNumber } from '../config/landscape'
import { Floor } from './Floor'
import { Fragments } from './Fragments'
import { Landscape, LANDSCAPE_SCALE } from './Landscape'
import { Particles } from './Particles'
import { Portal } from './Portal'
import { Sky } from './Sky'
import { Sparkles } from './Sparkles'

const blend = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}
/** Outro: the landscape ends once the portal covers the screen */
const OUTRO_END = 0.68
const DEG = Math.PI / 180

/** How far the camera leans with the pointer, in world units */
const PARALLAX = { x: 0.45, y: 0.3 }
/** Idle drift: the orbit sways this far (degrees) over about two minutes */
const IDLE_SWAY = 2.5

/**
 * Everything in the 3D scene, and how it follows the site: which shape the particles form,
 * where they sit, where the camera looks, and the theme's colours.
 *
 * On the full-screen scene pages (home hero, about story) the camera orbits the logo: each
 * scene swings it to a new angle, height and distance, so the sky, floor, sparkles and glass
 * appear to turn while the logo (which mostly turns to face the camera) stays readable. The
 * look-at point is offset so the logo sits beside the text. Other pages use fixed views.
 */
export class World {
  particles: Particles
  shapes: ShapeLibrary
  sky: Sky
  floor: Floor
  sparkles: Sparkles
  landscape: Landscape
  fragments: Fragments
  carousel: Carousel
  portal: Portal
  ready = false

  private environment: Environment
  /** Glass shards shown on this quality tier */
  private shards = true
  private fog: Fog
  private revealed = false
  private layout: Layout = { x: 0, y: 0, scale: 1, opacity: 0 }
  /** Logo position, and how far the view is shifted so the logo sits beside the text */
  private logoX = 0
  private shift = 0
  private orbit = { angle: 0, height: SCENE_ORBITS[0]!.height, distance: SCENE_ORBITS[0]!.distance }
  /** 1 while orbiting (scene pages), 0 on fixed page views; eased between */
  private orbitMix = 0
  private cameraTarget = new Vector3()
  private look = new Vector3()
  private lookTarget = new Vector3()
  private logo = new Vector3()
  private right = new Vector3()
  private parallax = { x: 0, y: 0 }
  private parallaxX: gsap.QuickToFunc
  private parallaxY: gsap.QuickToFunc
  private raycaster = new Raycaster()
  private plane = new Plane()
  private pointerWorld = new Vector3()
  private ndc = new Vector2()
  private viewDir = new Vector3()

  constructor(
    private scene: Scene,
    resources: Resources,
    renderer: WebGLRenderer,
    private camera: PerspectiveCamera
  ) {
    this.environment = new Environment(scene)
    this.sky = new Sky(scene)
    this.landscape = new Landscape(scene, resources)
    this.shapes = new ShapeLibrary(resources)
    this.particles = new Particles(scene, this.shapes, renderer)
    this.fragments = new Fragments(scene, renderer, this.particles.points)
    this.sparkles = new Sparkles(scene)
    this.carousel = new Carousel(scene)
    this.portal = new Portal(scene)
    // The particles draw after the portal, so the ring stays in front of it
    this.particles.points.renderOrder = 1000
    this.floor = new Floor(scene, () => [
      this.fragments.group,
      this.carousel.group,
      this.portal.mesh,
      ...this.landscape.hiddenInReflection,
    ])
    // Reaches out to the far mountains (about 48 units away)
    this.fog = new Fog(0x000000, 10, 60)
    scene.fog = this.fog
    // Damped pointer parallax (blueprint: gsap.quickTo)
    this.parallaxX = gsap.quickTo(this.parallax, 'x', { duration: 1.2, ease: 'power3.out' })
    this.parallaxY = gsap.quickTo(this.parallax, 'y', { duration: 1.2, ease: 'power3.out' })
  }

  /** Builds the particles as a cloud, ready to form the first shape when the visitor enters */
  async init(count: number, firstShape: string) {
    await this.particles.init(count, firstShape)
    this.ready = true
  }

  /** True on the page that owns the current full-screen scenes (home hero, about story) */
  static inScenes(state: Pick<FrameState, 'route' | 'scenesRoute' | 'heroScenes'>) {
    return state.heroScenes.length > 0 && state.route === state.scenesRoute
  }

  /**
   * The shape a page should show: the current scene's, a page's own (a case study's project
   * shape, when the library has it), or the default constellation
   */
  static shapeFor(
    state: Pick<FrameState, 'route' | 'scene' | 'heroScenes' | 'scenesRoute' | 'pageShape'>,
    has: (name: string) => boolean = () => true
  ) {
    if (!World.inScenes(state)) {
      return state.pageShape && has(state.pageShape) ? state.pageShape : PAGE_SHAPE
    }
    return state.heroScenes[state.scene]?.shape ?? state.heroScenes[0]?.shape ?? FALLBACK_SHAPE
  }

  setQuality(tier: QualityTier, width: number, height: number, pixelRatio: number) {
    const q = QUALITY[tier]
    this.fragments.setQuality(tier)
    this.shards = q.shards
    this.carousel.setQuality(tier)
    this.sparkles.setQuality(q.sparkles, q.fireflies)
    this.floor.setQuality(q.floor, width, height, pixelRatio)
  }

  resize(width: number, height: number, pixelRatio: number) {
    this.floor.resize(width, height, pixelRatio)
  }

  update(state: FrameState, palette: Palette, delta: number) {
    const reduced = state.reducedMotion
    const ease = reduced ? 1 : 1 - Math.exp(-delta * 3)

    // Theme colours (tweened by the palette)
    this.fog.color.copy(palette.colors.fog)
    // Night fog closes in sooner than the clear day's (Blender distances, scaled)
    this.fog.near = lookNumber('fogNear', palette.darkness) * LANDSCAPE_SCALE
    this.fog.far = lookNumber('fogFar', palette.darkness) * LANDSCAPE_SCALE
    this.environment.update(palette)
    this.landscape.update(palette, delta, reduced)
    this.fragments.update(palette, state.elapsed, delta, reduced)
    this.sparkles.update(
      palette,
      state.elapsed,
      state.resolutionY,
      state.entered ? 1 : 0.5,
      reduced
    )
    if (!this.ready) {
      this.sky.update(palette, this.camera.position, this.logo, state.elapsed, reduced)
      return
    }
    const { particles } = this
    particles.applyPalette(palette)

    // Quality tier changed the particle count
    if (state.particleCount !== particles.count) void particles.setCount(state.particleCount)

    // Shape: form the first one when the visitor enters, then follow scenes and pages
    const shape = World.shapeFor(state, (name) => this.shapes.has(name))
    if (state.entered) {
      if (!this.revealed) {
        this.revealed = true
        if (shape !== particles.shape) void particles.morphTo(shape, reduced)
        else particles.reveal(reduced)
      } else if (shape !== particles.shape) {
        void particles.morphTo(shape, reduced)
      }
    }

    // Placement: beside the scene text, fading and rising as the visitor scrolls past the
    // scenes; on other pages, where that page's view puts it
    const inScenes = World.inScenes(state)
    const side = state.heroScenes[state.scene]?.side ?? 'center'
    const view = pageView(state.route)
    const target = inScenes
      ? layoutFor(side, state.portrait)
      : state.portrait
        ? PAGE_LAYOUT_PORTRAIT
        : view.layout
    // Home hero outro (0 → 1 while scrolling past the last scene, -1 when there is none):
    // the particles stay in place and fade only as the portal swallows the screen
    const outro = inScenes && state.outro >= 0 ? state.outro : -1
    const fade = inScenes ? (outro >= 0 ? smooth(0.58, 0.72, outro) : state.scrollFade) : 0
    const lift = outro >= 0 ? 0 : fade
    const l = this.layout
    l.x = MathUtils.lerp(l.x, target.x, ease)
    l.y = MathUtils.lerp(l.y, target.y + lift * 2.2, ease)
    l.scale = MathUtils.lerp(l.scale, target.scale, ease)
    // Footer text on screen: dim the particles so links and the email stay easy to read.
    // On the Work page carousel they become a soft void behind the panels.
    const onCarousel = state.route === '/work' && !!state.carousel
    const visible =
      (state.entered ? 1 : 0.6) *
      (1 - Math.min(state.footerCover * 1.4, 1) * 0.65) *
      (onCarousel ? 0.35 : 1)
    l.opacity = MathUtils.lerp(l.opacity, target.opacity * (1 - fade * 0.9) * visible, ease)

    // Orbiting (scene pages): the logo stays at the centre of the stage and the view is shifted
    // so it sits beside the text. Fixed views: the logo itself moves aside.
    this.orbitMix = MathUtils.lerp(
      this.orbitMix,
      inScenes ? 1 : 0,
      reduced ? 1 : 1 - Math.exp(-delta * 2)
    )
    this.logoX = MathUtils.lerp(this.logoX, inScenes ? 0 : l.x, ease)
    this.shift = MathUtils.lerp(this.shift, inScenes ? l.x : 0, ease)

    const { points } = particles
    points.position.set(this.logoX, l.y, 0)
    points.scale.setScalar(l.scale)
    // Outro: the ring grows and rushes at the camera, so its balls swell and fly past
    if (outro > 0 && !reduced) {
      const grow = smooth(0, 0.7, outro) ** 2
      points.scale.multiplyScalar(1 + grow * 5.5)
      points.position.lerp(this.camera.position, grow * 0.7)
    }
    this.logo.copy(points.position)

    // Behind the portal the 3D landscape ends; it comes back when scrolling up again
    const ended = outro >= OUTRO_END
    this.landscape.hidden = ended
    this.fragments.group.visible = this.shards && !ended

    // Orbit for the current scene (no orbit and no drift with reduced motion)
    const goal = SCENE_ORBITS[state.scene % SCENE_ORBITS.length]!
    const orbitEase = reduced ? 1 : 1 - Math.exp(-delta * 1.8)
    const angle = reduced ? 0 : goal.angle + Math.sin(state.elapsed * 0.05) * IDLE_SWAY
    this.orbit.angle = MathUtils.lerp(this.orbit.angle, angle, orbitEase)
    this.orbit.height = MathUtils.lerp(this.orbit.height, goal.height, orbitEase)
    this.orbit.distance = MathUtils.lerp(this.orbit.distance, goal.distance, orbitEase)
    const a = this.orbit.angle * DEG * this.orbitMix

    // The logo mostly turns to face the camera, so it reads at every angle
    if (!reduced) {
      points.rotation.y = a * LOGO_FOLLOW + Math.sin(state.elapsed * 0.25) * 0.2
      points.rotation.x = Math.sin(state.elapsed * 0.17) * 0.06
    } else {
      points.rotation.set(0, 0, 0)
    }

    // Camera position: on the orbit around the logo, or the page's fixed view
    this.right.set(Math.cos(a), 0, -Math.sin(a))
    const orbitPos = [
      Math.sin(a) * this.orbit.distance,
      this.orbit.height,
      Math.cos(a) * this.orbit.distance,
    ] as const
    let cam: [number, number, number] = [
      blend(view.camera[0], orbitPos[0], this.orbitMix),
      blend(view.camera[1], orbitPos[1], this.orbitMix),
      blend(view.camera[2], orbitPos[2], this.orbitMix),
    ]
    // The footer reveal is filling: glide towards the next page's view, so when it opens
    // the camera is already there
    const preview = state.nextPreview
    if (preview && preview.progress > 0 && !reduced) {
      const to = pageView(preview.route).camera
      const t = preview.progress
      cam = [blend(cam[0], to[0], t), blend(cam[1], to[1], t), blend(cam[2], to[2], t)]
    }
    if (reduced) {
      this.parallax.x = this.parallax.y = 0
    } else {
      this.parallaxX(state.pointerNdc.x * PARALLAX.x)
      this.parallaxY(state.pointerNdc.y * PARALLAX.y)
    }
    this.cameraTarget
      .set(cam[0], cam[1] + this.parallax.y, cam[2])
      .addScaledVector(this.right, this.parallax.x)
    this.camera.position.lerp(this.cameraTarget, reduced ? 1 : 1 - Math.exp(-delta * 2.4))
    // Look past the logo, so it sits beside the text (the shift is along the camera's right)
    this.lookTarget.set(0, 0, 0).addScaledVector(this.right, -this.shift)
    this.look.lerp(this.lookTarget, reduced ? 1 : 1 - Math.exp(-delta * 2.4))
    this.camera.lookAt(this.look)

    this.carousel.update(
      state.carousel,
      onCarousel && state.entered,
      this.camera,
      state.pointerActive ? state.pointerNdc : null,
      state.elapsed,
      delta,
      reduced
    )
    this.sky.update(palette, this.camera.position, this.logo, state.elapsed, reduced)
    this.floor.update(palette, this.logo, state.elapsed, !onCarousel && !ended, delta)
    this.portal.update(outro, this.logo, this.camera, state.aspect, state.elapsed)

    // Pointer on a plane through the logo, facing the camera, for the particle physics
    const pointerOn = state.pointerActive && !reduced && state.entered ? 0.45 : 0
    const u = particles.uniforms
    u.uPointerStrength!.value = MathUtils.lerp(u.uPointerStrength!.value as number, pointerOn, ease)
    let pointer: Vector3 | null = null
    if (state.pointerActive) {
      this.ndc.copy(state.pointerNdc)
      this.raycaster.setFromCamera(this.ndc, this.camera)
      this.camera.getWorldDirection(this.viewDir)
      this.plane.setFromNormalAndCoplanarPoint(this.viewDir, this.logo)
      if (this.raycaster.ray.intersectPlane(this.plane, this.pointerWorld)) {
        pointer = this.pointerWorld
        ;(u.uPointer!.value as Vector3).copy(this.pointerWorld)
      }
    }

    u.uResolutionY!.value = state.resolutionY
    u.uOpacity!.value = l.opacity
    particles.step(delta, state.elapsed, pointer, reduced)
  }

  dispose() {
    this.carousel.dispose()
    this.portal.dispose()
    this.parallaxX.tween.kill()
    this.parallaxY.tween.kill()
    this.scene.fog = null
    this.fragments.dispose()
    this.sky.dispose()
    this.landscape.dispose()
    this.floor.dispose()
    this.sparkles.dispose()
    this.particles.dispose()
  }
}
