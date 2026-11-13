import { gsap } from 'gsap'
import { Fog, MathUtils, Vector2, Vector3 } from 'three'
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import type { QualityTier } from '../config/quality'
import {
  PAGE_LAYOUT_PORTRAIT,
  PAGE_SHAPE,
  SCENE_CAMERAS,
  layoutFor,
  pageView,
} from '../config/scenes'
import type { Layout } from '../config/scenes'
import type { Palette } from '../core/Palette'
import type { Resources } from '../core/Resources'
import type { FrameState } from '../Experience'

import { FALLBACK_SHAPE, ShapeLibrary } from '../shapes/ShapeLibrary'
import { Background } from './Background'
import { Environment } from './Environment'
import { Fragments } from './Fragments'
import { Particles } from './Particles'

const blend = (a: number, b: number, t: number) => a + (b - a) * t

/** How far the camera leans with the pointer, in world units */
const PARALLAX = { x: 0.45, y: 0.3 }

/**
 * Everything in the 3D scene, and how it follows the site: which shape the particles form,
 * where they sit, where the camera looks, and the theme's colours.
 */
export class World {
  particles: Particles
  shapes: ShapeLibrary
  background: Background
  fragments: Fragments
  ready = false

  private environment: Environment
  private fog: Fog
  private revealed = false
  private layout: Layout = { x: 0, y: 0, scale: 1, opacity: 0 }
  private cameraTarget = new Vector3()
  private pointer = new Vector3(999, 999, 0)
  private parallax = { x: 0, y: 0 }
  private parallaxX: gsap.QuickToFunc
  private parallaxY: gsap.QuickToFunc
  private glowCenter = new Vector2(0.5, 0.5)
  private projected = new Vector3()

  constructor(
    private scene: Scene,
    resources: Resources,
    renderer: WebGLRenderer,
    private camera: PerspectiveCamera
  ) {
    this.environment = new Environment(scene)
    this.background = new Background(scene)
    this.shapes = new ShapeLibrary(resources)
    this.particles = new Particles(scene, this.shapes)
    this.fragments = new Fragments(scene, renderer, this.particles.points)
    this.fog = new Fog(0x000000, 7, 18)
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

  setQuality(tier: QualityTier) {
    this.fragments.setQuality(tier)
  }

  update(state: FrameState, palette: Palette, delta: number) {
    const reduced = state.reducedMotion
    const ease = reduced ? 1 : 1 - Math.exp(-delta * 3)

    // Theme colours (tweened by the palette)
    this.fog.color.copy(palette.colors.background)
    this.fragments.update(palette, state.elapsed, delta, reduced)
    if (!this.ready) {
      this.background.update(palette, this.glowCenter, state.aspect)
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

    // Placement: opposite the scene text, fading and rising as the visitor scrolls past the
    // scenes; on other pages, where that page's view puts it
    const inScenes = World.inScenes(state)
    const side = state.heroScenes[state.scene]?.side ?? 'center'
    const view = pageView(state.route)
    const target = inScenes
      ? layoutFor(side, state.portrait)
      : state.portrait
        ? PAGE_LAYOUT_PORTRAIT
        : view.layout
    const fade = inScenes ? state.scrollFade : 0
    const l = this.layout
    l.x = MathUtils.lerp(l.x, target.x, ease)
    l.y = MathUtils.lerp(l.y, target.y + fade * 2.2, ease)
    l.scale = MathUtils.lerp(l.scale, target.scale, ease)
    // Footer text on screen: dim the particles so links and the email stay easy to read
    const visible = (state.entered ? 1 : 0.6) * (1 - Math.min(state.footerCover * 1.4, 1) * 0.65)
    l.opacity = MathUtils.lerp(l.opacity, target.opacity * (1 - fade * 0.9) * visible, ease)

    const { points } = particles
    points.position.set(l.x, l.y, 0)
    points.scale.setScalar(l.scale)
    if (!reduced) {
      points.rotation.y = Math.sin(state.elapsed * 0.25) * 0.2
      points.rotation.x = Math.sin(state.elapsed * 0.17) * 0.06
    }

    // Camera: one position per scene, one per page elsewhere (so a page change moves the
    // camera through the world), leaning with the pointer
    let cam = inScenes ? SCENE_CAMERAS[state.scene % SCENE_CAMERAS.length]! : view.camera
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
    this.cameraTarget.set(cam[0] + this.parallax.x, cam[1] + this.parallax.y, cam[2])
    this.camera.position.lerp(this.cameraTarget, reduced ? 1 : 1 - Math.exp(-delta * 2.4))
    this.camera.lookAt(0, 0, 0)

    // Background glow follows the particles on screen
    this.projected.copy(points.position).project(this.camera)
    this.glowCenter.set(this.projected.x * 0.5 + 0.5, this.projected.y * 0.5 + 0.5)
    this.background.update(palette, this.glowCenter, state.aspect)

    // Shader inputs
    const u = particles.uniforms
    u.uTime!.value = reduced ? 0 : state.elapsed
    u.uResolutionY!.value = state.resolutionY
    u.uOpacity!.value = l.opacity
    this.pointer.lerp(state.pointer, 1 - Math.exp(-delta * 8))
    ;(u.uPointer!.value as Vector3).copy(this.pointer)
    const pointerOn = state.pointerActive && !reduced && state.entered ? 0.45 : 0
    u.uPointerStrength!.value = MathUtils.lerp(u.uPointerStrength!.value as number, pointerOn, ease)
  }

  dispose() {
    this.parallaxX.tween.kill()
    this.parallaxY.tween.kill()
    this.scene.fog = null
    this.fragments.dispose()
    this.background.dispose()
    this.particles.dispose()
  }
}
