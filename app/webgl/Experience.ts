import { Scene } from 'three'
import type { Quality, Theme } from '~/stores/app'
import { QUALITY, resolveQuality } from './config/quality'
import { sources } from './config/sources'
import { Camera } from './core/Camera'
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
  trackLoad: <T>(task: Promise<T>) => Promise<T>
}

/** A snapshot of app state, passed to everything in the world on each frame */
export interface FrameState {
  theme: Theme
  scene: number
  route: string
  reducedMotion: boolean
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
  world: World
  debug: Debug

  private reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  private currentQuality: Quality | null = null
  private lazyStarted = false
  private frameState: FrameState = { theme: 'light', scene: 0, route: '/', reducedMotion: false }

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
    this.world = new World(this.scene)
    this.debug = new Debug()
    void this.debug.init().then(() => this.setupDebug())
    // Typing #debug onto an open page turns the tools on too
    window.addEventListener('hashchange', this.onHashChange)

    this.sizes.on('resize', () => {
      this.camera.resize()
      this.renderer.resize()
    })
    this.time.on('tick', this.update)

    // Eager assets, then a shader warm-up, both count towards the preloader
    state.trackLoad(
      this.resources
        .loadEager()
        .then(() => this.renderer.instance.compileAsync(this.scene, this.camera.instance))
        .catch((error) => console.warn('[webgl] Warm-up failed', error))
    )
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
    const renderer = this.renderer.instance
    const folder = this.debug.gui.addFolder('Renderer')
    folder.add(renderer, 'toneMappingExposure', 0, 3, 0.01).name('exposure')
    folder
      .add(this.camera.instance, 'fov', 15, 75, 1)
      .onChange(() => this.camera.instance.updateProjectionMatrix())
    folder.add(this.camera.instance.position, 'z', 2, 20, 0.1).name('camera z')
  }

  private update = ({ delta }: TickEvent) => {
    const { state } = this

    // Quality tier changes the pixel ratio cap (particles, fluid and bloom from Phase 6 on)
    if (state.quality !== this.currentQuality) {
      this.currentQuality = state.quality
      this.sizes.setMaxPixelRatio(QUALITY[resolveQuality(state.quality)].maxPixelRatio)
    }

    // Load the rest once the visitor is in
    if (state.entered && !this.lazyStarted) {
      this.lazyStarted = true
      void this.resources.loadLazy()
    }

    this.frameState.theme = state.theme
    this.frameState.scene = state.scene
    this.frameState.route = state.route
    this.frameState.reducedMotion = this.reducedMotionQuery.matches

    this.world.update(this.frameState, delta)

    this.debug.begin()
    this.renderer.render()
    this.debug.end()
  }

  dispose() {
    window.removeEventListener('hashchange', this.onHashChange)
    this.time.dispose()
    this.sizes.dispose()
    this.world.dispose()
    this.resources.dispose()
    this.renderer.dispose()
    this.debug.dispose()
    this.canvas.remove()
  }
}
