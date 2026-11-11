import { MathUtils, Vector3 } from 'three'
import type { PerspectiveCamera, Scene } from 'three'
import type { Theme } from '~/stores/app'
import {
  PAGE_CAMERA,
  PAGE_LAYOUT,
  PAGE_LAYOUT_PORTRAIT,
  PAGE_SHAPE,
  SCENE_CAMERAS,
  layoutFor,
} from '../config/scenes'
import type { Layout } from '../config/scenes'
import type { Resources } from '../core/Resources'
import type { FrameState } from '../Experience'
import { FALLBACK_SHAPE, ShapeLibrary } from '../shapes/ShapeLibrary'
import { Environment } from './Environment'
import { Particles } from './Particles'

/**
 * Everything in the 3D scene, and how it follows the site: which shape the particles form,
 * where they sit, and where the camera looks, for each hero scene and each page.
 */
export class World {
  particles: Particles
  shapes: ShapeLibrary
  ready = false

  private environment: Environment
  private revealed = false
  private layout: Layout = { x: 0, y: 0, scale: 1, opacity: 0 }
  private cameraTarget = new Vector3()
  private pointer = new Vector3(999, 999, 0)

  constructor(
    scene: Scene,
    resources: Resources,
    private camera: PerspectiveCamera
  ) {
    this.environment = new Environment(scene)
    this.shapes = new ShapeLibrary(resources)
    this.particles = new Particles(scene, this.shapes)
  }

  /** Builds the particles as a cloud, ready to form the first shape when the visitor enters */
  async init(count: number, firstShape: string, theme: Theme) {
    await this.particles.init(count, firstShape, theme)
    this.ready = true
  }

  /** The shape a page should show */
  static shapeFor(state: Pick<FrameState, 'route' | 'scene' | 'heroScenes'>) {
    if (state.route !== '/') return PAGE_SHAPE
    return state.heroScenes[state.scene]?.shape ?? state.heroScenes[0]?.shape ?? FALLBACK_SHAPE
  }

  update(state: FrameState, delta: number) {
    if (!this.ready) return
    const { particles } = this
    const reduced = state.reducedMotion
    const ease = reduced ? 1 : 1 - Math.exp(-delta * 3)

    // Quality tier changed the particle count
    if (state.particleCount !== particles.count) void particles.setCount(state.particleCount)

    // Shape: form the first one when the visitor enters, then follow scenes and pages
    const shape = World.shapeFor(state)
    if (state.entered) {
      if (!this.revealed) {
        this.revealed = true
        if (shape !== particles.shape) void particles.morphTo(shape, reduced)
        else particles.reveal(reduced)
      } else if (shape !== particles.shape) {
        void particles.morphTo(shape, reduced)
      }
    }

    // Placement: opposite the hero text, fading and rising as the visitor scrolls past it
    const onHome = state.route === '/'
    const side = state.heroScenes[state.scene]?.side ?? 'center'
    const target = onHome
      ? layoutFor(side, state.portrait)
      : state.portrait
        ? PAGE_LAYOUT_PORTRAIT
        : PAGE_LAYOUT
    const fade = onHome ? state.scrollFade : 0
    const l = this.layout
    l.x = MathUtils.lerp(l.x, target.x, ease)
    l.y = MathUtils.lerp(l.y, target.y + fade * 2.2, ease)
    l.scale = MathUtils.lerp(l.scale, target.scale, ease)
    const visible = state.entered || particles.uniforms.uProgress!.value > 0 ? 1 : 0.6
    l.opacity = MathUtils.lerp(l.opacity, target.opacity * (1 - fade * 0.75) * visible, ease)

    const { points } = particles
    points.position.set(l.x, l.y, 0)
    points.scale.setScalar(l.scale)
    if (!reduced) {
      points.rotation.y = Math.sin(state.elapsed * 0.25) * 0.2
      points.rotation.x = Math.sin(state.elapsed * 0.17) * 0.06
    }

    // Camera: one position per hero scene, a calm default elsewhere
    const cam = onHome ? SCENE_CAMERAS[state.scene % SCENE_CAMERAS.length]! : PAGE_CAMERA
    this.cameraTarget.fromArray(cam)
    this.camera.position.lerp(this.cameraTarget, ease * 0.8)
    this.camera.lookAt(0, 0, 0)

    // Shader inputs
    const u = particles.uniforms
    u.uTime!.value = reduced ? 0 : state.elapsed
    u.uResolutionY!.value = state.resolutionY
    u.uOpacity!.value = l.opacity
    this.pointer.lerp(state.pointer, 1 - Math.exp(-delta * 8))
    ;(u.uPointer!.value as Vector3).copy(this.pointer)
    const pointerOn = state.pointerActive && !reduced && state.entered ? 0.45 : 0
    u.uPointerStrength!.value = MathUtils.lerp(u.uPointerStrength!.value as number, pointerOn, ease)
    particles.applyTheme(state.theme, reduced ? 1 : 1 - Math.exp(-delta * 4))
  }

  dispose() {
    this.particles.dispose()
  }
}
