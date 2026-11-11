import { Scene } from 'three'
import type { Vector3 } from 'three'
import type { Quality, Theme } from '~/stores/app'
import { QUALITY, resolveQuality } from './config/quality'
import type { HeroSceneInfo } from './config/scenes'
import { sources } from './config/sources'
import { Camera } from './core/Camera'
import { Pointer } from './core/Pointer'
import { Renderer } from './core/Renderer'
import { Resources } from './core/Resources'
import { Sizes } from './core/Sizes'
import { Time } from './core/Time'
import type { TickEvent } from './core/Time'
import { Debug } from './debug/Debug'
import { World } from './world/World'

/** What the Experience reads from the app store every frame (the only Vue → WebGL bridge) */
export interface AppStateSource {
  theme: Theme
  scene: number
  quality: Quality
  route: string
  entered: boolean
  heroScenes: HeroSceneInfo[]
  trackLoad: <T>(task: Promise<T>) => Promise<T>
}

/** A snapshot of app and browser state, passed to everything in the world on each frame */
export interface FrameState {
  theme: Theme
  scene: number
  route: string
  entered: boolean
  heroScenes: HeroSceneInfo[]
  reducedMotion: boolean
  particleCount: number
  /** Seconds since start */
  elapsed: number
  /** 0 at the top of the page, 1 once the visitor has scrolled one screen down */
  scrollFade: number
  /** Taller than wide (phones held upright) */
  portrait: boolean
  /** Drawing-buffer height in pixels, for resolution-independent particle sizes */
  resolutionY: number
  pointer: Vector3
  pointerActive: boolean
}

/**
 * The persistent 3D world. Created once by plugins/experience.client.ts and never torn down
 * by page changes: the canvas lives directly on <body>, outside Vue's page tree, so it keeps
 * rendering through navigation and even when an error page replaces the app.
 */
export class Experience {
  canvas: HTMLCanvasElement
  sizes: Sizes
  time: Time
  scene: Scene
  camera: Camera
  renderer: Renderer
  resources: Resources
  pointer: Pointer
  world: World
  debug: Debug

  private reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  private currentQuality: Quality | null = null
  private lazyStarted = false
  private frame: FrameState

  constructor(private state: AppStateSource) {
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'webgl'
    this.canvas.setAttribute('aria-hidden', 'true')
    document.body.prepend(this.canvas)

    this.sizes = new Sizes()
    this.scene = new Scene()
    this.camera = new Camera(this.sizes)
    // Created before the clock: if WebGL is unavailable this throws and nothing keeps running
    this.renderer = new Renderer(this.canvas, this.sizes, this.scene, this.camera)
    this.time = new Time()
    this.resources = new Resources(sources, this.renderer.instance, state.trackLoad)
    this.pointer = new Pointer()
    this.world = new World(this.scene, this.resources, this.camera.instance)
    this.debug = new Debug()
    void this.debug.init().then(() => this.setupDebug())
    // Typing #debug onto an open page turns the tools on too
    window.addEventListener('hashchange', this.onHashChange)

    this.frame = {
      theme: state.theme,
      scene: 0,
      route: window.location.pathname,
      entered: false,
      heroScenes: state.heroScenes,
      reducedMotion: this.reducedMotionQuery.matches,
      particleCount: this.particleCount(),
      elapsed: 0,
      scrollFade: 0,
      portrait: false,
      resolutionY: 1,
      pointer: this.pointer.world,
      pointerActive: false,
    }

    this.sizes.on('resize', () => {
      this.camera.resize()
      this.renderer.resize()
    })
    this.time.on('tick', this.update)

    // A model that replaces a generated shape takes effect from the next morph
    this.resources.on('loaded', ({ name }) => {
      if (name.startsWith('shape:')) this.world.shapes.clear()
    })

    // Eager assets, the particle shapes and a shader warm-up all count towards the preloader
    const firstShape = World.shapeFor({
      route: window.location.pathname,
      scene: 0,
      heroScenes: state.heroScenes,
    })
    state.trackLoad(
      this.resources
        .loadEager()
        .then(() => this.world.init(this.frame.particleCount, firstShape, state.theme))
        .then(() => this.renderer.instance.compileAsync(this.scene, this.camera.instance))
        .catch((error) => console.warn('[webgl] Warm-up failed', error))
    )
  }

  private particleCount() {
    return QUALITY[resolveQuality(this.state.quality)].particles
  }

  private onHashChange = () => {
    if (window.location.hash === '#debug' && !this.debug.active) {
      void this.debug.init().then(() => this.setupDebug())
    }
  }

  // #debug only: tuning controls, and a handle for the browser console and tests
  private setupDebug() {
    if (!this.debug.active || !this.debug.gui) return
    ;(window as unknown as { __experience?: Experience }).__experience = this
    const gui = this.debug.gui
    const renderer = this.renderer.instance
    const view = gui.addFolder('Renderer')
    view.add(renderer, 'toneMappingExposure', 0, 3, 0.01).name('exposure')
    view
      .add(this.camera.instance, 'fov', 15, 75, 1)
      .onChange(() => this.camera.instance.updateProjectionMatrix())

    const u = this.world.particles.uniforms
    const particles = gui.addFolder('Particles')
    particles.add(u.uSize!, 'value', 0.005, 0.15, 0.001).name('size')
    particles.add(u.uDrift!, 'value', 0, 0.3, 0.001).name('drift')
    particles.add(u.uScatter!, 'value', 0, 2, 0.01).name('morph burst')
    particles.add(u.uPointerRadius!, 'value', 0.1, 3, 0.01).name('pointer radius')
    const shapes = { shape: this.world.particles.shape ?? 'letter-a' }
    particles
      .add(shapes, 'shape', ['letter-a', 'neural-net', 'leaf', 'chat-bubble', 'constellation'])
      .name('preview shape')
      .onChange((name: string) => void this.world.particles.morphTo(name))
  }

  private update = ({ delta, elapsed }: TickEvent) => {
    const { state, frame } = this

    // Quality tier: pixel ratio cap and particle count
    if (state.quality !== this.currentQuality) {
      this.currentQuality = state.quality
      this.sizes.setMaxPixelRatio(QUALITY[resolveQuality(state.quality)].maxPixelRatio)
      frame.particleCount = this.particleCount()
    }

    // Load the rest once the visitor is in
    if (state.entered && !this.lazyStarted) {
      this.lazyStarted = true
      void this.resources.loadLazy()
    }

    this.pointer.update(this.camera.instance, performance.now())

    frame.theme = state.theme
    frame.scene = state.scene
    frame.route = state.route
    frame.entered = state.entered
    frame.heroScenes = state.heroScenes
    frame.reducedMotion = this.reducedMotionQuery.matches
    frame.elapsed = elapsed
    frame.scrollFade = Math.min(Math.max(window.scrollY / Math.max(this.sizes.height, 1), 0), 1)
    frame.portrait = this.sizes.width < this.sizes.height * 0.9
    frame.resolutionY = this.sizes.height * this.sizes.pixelRatio
    frame.pointerActive = this.pointer.active

    this.world.update(frame, delta)

    this.debug.begin()
    this.renderer.render()
    this.debug.end()
  }

  dispose() {
    window.removeEventListener('hashchange', this.onHashChange)
    this.time.dispose()
    this.sizes.dispose()
    this.pointer.dispose()
    this.world.dispose()
    this.resources.dispose()
    this.renderer.dispose()
    this.debug.dispose()
    this.canvas.remove()
  }
}
