import { Scene, Vector2 } from 'three'
import type { Vector3 } from 'three'
import type { Quality, Theme } from '~/stores/app'
import { QUALITY, resolveQuality } from './config/quality'
import type { QualityTier } from './config/quality'
import type { HeroSceneInfo } from './config/scenes'
import { sources } from './config/sources'
import { Camera } from './core/Camera'
import { detectGpuTier } from './core/GpuTier'
import { Palette } from './core/Palette'
import { PerformanceMonitor } from './core/PerformanceMonitor'
import { Pointer } from './core/Pointer'
import { Renderer } from './core/Renderer'
import { Resources } from './core/Resources'
import { Sizes } from './core/Sizes'
import { Time } from './core/Time'
import type { TickEvent } from './core/Time'
import { Debug } from './debug/Debug'
import { Fluid } from './effects/Fluid'
import { MediaPlanes } from './effects/MediaPlanes'
import { PostProcessing } from './effects/PostProcessing'
import { World } from './world/World'

/** What the Experience reads from the app store every frame (the only Vue → WebGL bridge) */
export interface AppStateSource {
  theme: Theme
  scene: number
  quality: Quality
  route: string
  entered: boolean
  heroScenes: HeroSceneInfo[]
  /** Written back by the Experience, so the settings panel can say what "Auto" means */
  autoTier: QualityTier
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
  /** Viewport width / height */
  aspect: number
  pointer: Vector3
  /** Pointer in -1..1 screen coordinates (for camera parallax) */
  pointerNdc: Vector2
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
  palette: Palette
  media: MediaPlanes
  fluid: Fluid
  post: PostProcessing
  world: World
  debug: Debug

  private reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  private currentQuality: Quality | null = null
  private tier: QualityTier = 'high'
  /** What "Auto" quality means right now: the detected tier, stepped down if frames run slow */
  autoTier: QualityTier = 'high'
  /** GPU name from detection (for the debug console and tests) */
  gpu = ''
  /** Quality is applied once GPU detection has picked the Auto tier */
  private tierReady = false
  private monitor = new PerformanceMonitor()
  private mediaPointer = new Vector2()
  private fluidPointer = new Vector2()
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
    // Start in the theme the head script already applied, so nothing fades in from the wrong one
    this.palette = new Palette(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
    this.media = new MediaPlanes()
    this.media.resize(this.sizes.width, this.sizes.height)
    this.fluid = new Fluid(this.renderer.instance)
    this.fluid.resize(this.sizes.width, this.sizes.height)
    this.post = new PostProcessing(
      this.renderer.instance,
      this.scene,
      this.camera.instance,
      this.media,
      this.fluid
    )
    this.world = new World(this.scene, this.resources, this.renderer.instance, this.camera.instance)
    this.debug = new Debug()
    void this.debug.init().then(() => this.setupDebug())
    // Typing #debug onto an open page turns the tools on too
    window.addEventListener('hashchange', this.onHashChange)

    this.frame = {
      theme: state.theme,
      scene: 0,
      route: state.route,
      entered: false,
      heroScenes: state.heroScenes,
      reducedMotion: this.reducedMotionQuery.matches,
      particleCount: this.particleCount(),
      elapsed: 0,
      scrollFade: 0,
      portrait: false,
      resolutionY: 1,
      aspect: 1,
      pointer: this.pointer.world,
      pointerNdc: this.pointer.ndc,
      pointerActive: false,
    }

    this.sizes.on('resize', () => {
      this.camera.resize()
      this.renderer.resize()
      this.post.resize(this.sizes.width, this.sizes.height, this.sizes.pixelRatio)
      this.media.resize(this.sizes.width, this.sizes.height)
      this.fluid.resize(this.sizes.width, this.sizes.height)
    })
    this.time.on('tick', this.update)

    // A model that replaces a generated shape takes effect from the next morph
    this.resources.on('loaded', ({ name }) => {
      if (name.startsWith('shape:')) this.world.shapes.clear()
    })

    // GPU detection picks the Auto tier before the particles are built, so they start at the
    // right count. It reads small local benchmark files and has a time limit.
    const tier = detectGpuTier(this.renderer.instance.getContext()).then(({ tier, gpu }) => {
      this.gpu = gpu
      this.setAutoTier(tier)
      this.tierReady = true
    })

    // Eager assets, GPU detection, the particle shapes and a shader warm-up all count towards
    // the preloader
    const firstShape = World.shapeFor({
      route: state.route,
      scene: 0,
      heroScenes: state.heroScenes,
    })
    state.trackLoad(
      Promise.all([this.resources.loadEager(), tier])
        .then(() => this.world.init(this.particleCount(), firstShape))
        .then(() => this.renderer.instance.compileAsync(this.scene, this.camera.instance))
        .catch((error) => console.warn('[webgl] Warm-up failed', error))
    )
  }

  private setAutoTier(tier: QualityTier) {
    this.autoTier = tier
    this.state.autoTier = tier
    this.frame.particleCount = this.particleCount()
    this.currentQuality = null // re-applied on the next frame
  }

  private particleCount() {
    return QUALITY[resolveQuality(this.state.quality, this.autoTier)].particles
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
    const view = gui.addFolder('Camera')
    view
      .add(this.camera.instance, 'fov', 15, 75, 1)
      .onChange(() => this.camera.instance.updateProjectionMatrix())

    // Live look values (a theme switch fades them back to the theme's settings)
    const look = gui.addFolder('Look (current theme)')
    const v = this.palette.values
    look.add(v, 'bloomIntensity', 0, 3, 0.01).name('bloom')
    look.add(v, 'bloomThreshold', 0, 1, 0.01).name('bloom threshold')
    look.add(v, 'contrast', 0.7, 1.4, 0.01)
    look.add(v, 'saturation', 0, 2, 0.01)
    look.add(v, 'lift', 0, 0.2, 0.001)
    look.add(v, 'shadowTintAmount', 0, 0.5, 0.01).name('shadow tint')
    look.add(v, 'vignette', 0, 1, 0.01)
    look.add(v, 'grain', 0, 0.2, 0.001)
    look.add(v, 'intensity', 0, 1.5, 0.01).name('particle glow')

    const fluid = gui.addFolder('Fluid smoke')
    const f = this.fluid.settings
    fluid.add(f, 'density', 0, 0.5, 0.005).name('smoke per frame')
    fluid.add(f, 'radius', 0.0005, 0.01, 0.0001).name('splat size')
    fluid.add(f, 'force', 0, 10000, 100)
    fluid.add(f, 'curl', 0, 50, 1).name('swirl')
    fluid.add(f, 'densityDissipation', 0, 4, 0.05).name('smoke fade')
    fluid.add(f, 'velocityDissipation', 0, 4, 0.05).name('motion fade')
    look.add(v, 'fluidOpacity', 0, 1, 0.01).name('smoke opacity')

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

  private update = ({ delta, elapsed, rawDelta }: TickEvent) => {
    const { state, frame } = this

    // Auto quality: step down a tier if this device can't keep frames smooth
    if (state.quality === 'auto' && state.entered && this.world.ready && !document.hidden) {
      const lower = this.monitor.update(rawDelta, this.autoTier)
      if (lower) this.setAutoTier(lower)
    } else {
      this.monitor.reset()
    }

    // Quality tier: pixel ratio cap, particle count, post-processing, fluid and glass
    if (this.tierReady && state.quality !== this.currentQuality) {
      this.currentQuality = state.quality
      this.tier = resolveQuality(state.quality, this.autoTier)
      this.monitor.reset()
      this.sizes.setMaxPixelRatio(QUALITY[this.tier].maxPixelRatio)
      frame.particleCount = this.particleCount()
      this.fluid.setQuality(this.tier)
      this.post.setQuality(this.tier, this.sizes.pixelRatio)
      this.world.setQuality(this.tier)
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
    if (state.theme !== this.palette.theme) this.palette.setTheme(state.theme, frame.reducedMotion)
    frame.elapsed = elapsed
    frame.scrollFade = Math.min(Math.max(window.scrollY / Math.max(this.sizes.height, 1), 0), 1)
    frame.portrait = this.sizes.width < this.sizes.height * 0.9
    frame.resolutionY = this.sizes.height * this.sizes.pixelRatio
    frame.aspect = this.sizes.width / Math.max(this.sizes.height, 1)
    frame.pointerActive = this.pointer.active

    this.world.update(frame, this.palette, delta)
    // Pointer smoke: only once the visitor is in, and never with reduced motion
    this.fluidPointer.set((this.pointer.ndc.x + 1) / 2, (this.pointer.ndc.y + 1) / 2)
    this.fluid.update(
      delta,
      this.pointer.active ? this.fluidPointer : null,
      state.entered && !frame.reducedMotion && this.post.enabled
    )

    this.post.update(this.palette, frame.reducedMotion)
    this.mediaPointer.set(
      ((this.pointer.ndc.x + 1) / 2) * this.sizes.width,
      ((1 - this.pointer.ndc.y) / 2) * this.sizes.height
    )
    this.media.update(
      this.palette,
      elapsed,
      delta,
      this.pointer.active ? this.mediaPointer : null,
      frame.reducedMotion
    )

    this.debug.begin()
    if (this.post.enabled) this.post.render(delta)
    else this.renderer.render(this.media)
    this.debug.end()
  }

  dispose() {
    window.removeEventListener('hashchange', this.onHashChange)
    this.time.dispose()
    this.sizes.dispose()
    this.pointer.dispose()
    this.world.dispose()
    this.post.dispose()
    this.fluid.dispose()
    this.media.dispose()
    this.palette.dispose()
    this.resources.dispose()
    this.renderer.dispose()
    this.debug.dispose()
    this.canvas.remove()
  }
}
