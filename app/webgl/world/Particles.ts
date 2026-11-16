import { gsap } from 'gsap'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  FloatType,
  HalfFloatType,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { DataTexture, Scene, WebGLRenderer } from 'three'
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js'
import type { Variable } from 'three/addons/misc/GPUComputationRenderer.js'
import { INTRO_CLOUD_RADIUS } from '../config/scenes'
import type { Palette } from '../core/Palette'
import fragmentShader from '../shaders/particles/fragment.glsl'
import simPosition from '../shaders/particles/simPosition.glsl'
import simVelocity from '../shaders/particles/simVelocity.glsl'
import vertexShader from '../shaders/particles/vertex.glsl'
import { createRandom, onSphere } from '../shapes/random'
import type { ShapeLibrary } from '../shapes/ShapeLibrary'

/** Morph timing, seconds: the burst, and how long until everyone has arrived */
const BURST_DURATION = 1
const MORPH_DURATION = 2.2

/**
 * Physics starting values (tunable from #debug). Spring and damping are close to critical:
 * particles glide to their place and stop there instead of overshooting and wobbling. The
 * flow and pulse only add a slow shimmer (they push a particle about 0.02 units off its spot),
 * so the shape stays crisp.
 */
export const PHYSICS = {
  spring: 0.06,
  damping: 0.8,
  flowStrength: 0.0012,
  flowScale: 1.6,
  flowSpeed: 0.08,
  pulse: 0.0004,
  burstPeak: 0.04,
  pointerRadius: 0.75,
  pointerStrength: 0.045,
}

/** Rim light colours: cool on one side of each ball, warm on the other (sRGB) */
const RIM_COOL = '#a9b8ff'
const RIM_WARM = '#ff9ad8'

/**
 * The particle logo: tens of thousands of small lit spheres driven by physics on the GPU.
 * Positions and velocities live in textures (GPUComputationRenderer); every frame, springs
 * pull each particle towards its home on the current shape, with damping, a curl-noise flow,
 * a breathing pulse and the pointer pushing them aside. A morph swaps the target shape and
 * fires a short outward burst; the springs then pull everyone into the new shape, each
 * particle at its own moment. Interrupting a morph is naturally safe.
 *
 * Every shape has the same number of points (size × size), so any shape can become any other.
 */
export class Particles {
  points: Points<BufferGeometry, ShaderMaterial>
  count = 0
  /** The shape the particles are heading to (or sitting in) */
  shape: string | null = null
  /** Simulation texture size (count = size²) */
  size = 0
  physics = { ...PHYSICS }

  private geometry = new BufferGeometry()
  private material: ShaderMaterial
  private gpu: GPUComputationRenderer | null = null
  private position: Variable | null = null
  private velocity: Variable | null = null
  private target: DataTexture | null = null
  /** The first shape, waiting for reveal() (the particles hover as a cloud until then) */
  private pendingReveal: DataTexture | null = null
  private morphTime = 10
  private burst = { value: 0 }
  private tweens: gsap.core.Animation[] = []
  /** Each particle's random value (kept in w of every texture, so copies preserve it) */
  private hashes = new Float32Array(0)
  private request = 0
  private pendingCount = 0
  private local = new Vector3()
  private lastPointer = new Vector3()
  private pointerVelocity = new Vector3()
  private hasPointer = false
  /** Reduced motion: particles are placed, not simulated */
  private still = false

  constructor(
    private scene: Scene,
    private library: ShapeLibrary,
    private renderer: WebGLRenderer
  ) {
    const color = (hex: string) => {
      const c = new Color(hex)
      return new Vector3(c.r, c.g, c.b)
    }
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: true,
      blending: NormalBlending,
      uniforms: {
        uPositions: { value: null },
        uTime: { value: 0 },
        uProgress: { value: 1 },
        uDrift: { value: 1 },
        uScatter: { value: 1 },
        uSize: { value: 0.026 },
        uResolutionY: { value: 1 },
        uPointer: { value: new Vector3(999, 999, 0) },
        uPointerRadius: { value: PHYSICS.pointerRadius },
        uPointerStrength: { value: 0 },
        uSparkRatio: { value: 0.04 },
        uColorA: { value: new Vector3() },
        uColorB: { value: new Vector3() },
        uColorC: { value: new Vector3() },
        uSparkColor: { value: new Vector3() },
        uRimCool: { value: color(RIM_COOL) },
        uRimWarm: { value: color(RIM_WARM) },
        uLightDir: { value: new Vector3(-0.45, 0.6, 0.65) },
        uSpecular: { value: 0.65 },
        uGlow: { value: 0.35 },
        uOpacity: { value: 1 },
        uIntensity: { value: 1 },
      },
    })
    this.points = new Points(this.geometry, this.material)
    this.points.name = 'particles'
    this.points.frustumCulled = false
    scene.add(this.points)
  }

  get uniforms() {
    return this.material.uniforms
  }

  /** Builds the particles as a loose cloud that will form `shape` when revealed */
  async init(count: number, shape: string) {
    const size = Math.round(Math.sqrt(count))
    const points = await this.library.get(shape, size * size)
    this.allocate(size, cloud(size * size))
    this.setTarget(this.pack(cloud(size * size)))
    this.pendingReveal = this.pack(points)
    this.shape = shape
    this.uniforms.uProgress!.value = 0
  }

  /** Forms the first shape out of the loading cloud */
  reveal(instant = false) {
    if (!this.pendingReveal) return
    const target = this.pendingReveal
    this.pendingReveal = null
    this.startMorph(target, instant, 0.4)
  }

  /** Moves every particle to `shape`. Safe to call mid-morph. */
  async morphTo(shape: string, instant = false) {
    if (shape === this.shape && !this.pendingReveal) return
    this.shape = shape
    const request = ++this.request
    const points = await this.library.get(shape, this.count)
    if (request !== this.request) return // a newer request replaced this one
    const target = this.pack(points)
    if (this.pendingReveal) {
      // Still the loading cloud: form this shape straight out of it
      this.pendingReveal.dispose()
      this.pendingReveal = target
      this.reveal(instant)
      return
    }
    this.startMorph(target, instant, 1)
  }

  /** Rebuilds with a new particle count (quality change), keeping the current shape */
  async setCount(count: number) {
    const size = Math.round(Math.sqrt(count))
    // Called every frame until done: ignore repeats while a rebuild is on its way
    if (size === this.size || size * size === this.pendingCount || !this.shape) return
    this.pendingCount = size * size
    const shape = this.shape
    const request = ++this.request
    const points = await this.library.get(shape, size * size)
    this.pendingCount = 0
    if (request !== this.request) return
    const revealing = !!this.pendingReveal
    this.allocate(size, revealing ? cloud(size * size) : points)
    if (revealing) {
      this.pendingReveal?.dispose()
      this.pendingReveal = this.pack(points)
      this.setTarget(this.pack(cloud(size * size)))
    } else {
      this.setTarget(this.pack(points))
    }
    this.uniforms.uProgress!.value = 1
  }

  /**
   * Advances the physics one frame.
   * @param pointer pointer position in world space, or null when it is not over the page
   */
  step(delta: number, elapsed: number, pointer: Vector3 | null, reduced: boolean) {
    const gpu = this.gpu
    if (!gpu || !this.position || !this.velocity) return
    this.uniforms.uTime!.value = reduced ? 0 : elapsed

    if (reduced) {
      // A still, formed shape: place the particles once and stop simulating
      if (!this.still) {
        this.still = true
        this.placeOnTarget()
      }
      return
    }
    this.still = false
    // Nothing to see (scrolled away or faded out): skip the physics
    if ((this.uniforms.uOpacity!.value as number) < 0.01) return

    this.morphTime += delta
    const v = this.velocity.material.uniforms
    const p = this.position.material.uniforms
    const ph = this.physics
    v.uDelta!.value = delta
    p.uDelta!.value = delta
    v.uTime!.value = elapsed
    v.uSpring!.value = ph.spring
    v.uDamping!.value = ph.damping
    v.uFlowStrength!.value = ph.flowStrength * (this.uniforms.uDrift!.value as number)
    v.uFlowScale!.value = ph.flowScale
    v.uFlowSpeed!.value = ph.flowSpeed
    v.uPulse!.value = ph.pulse
    v.uBurst!.value = this.burst.value * (this.uniforms.uScatter!.value as number)
    v.uMorphTime!.value = this.morphTime

    // Pointer in the particles' own space, with its velocity for the drag
    const strength = this.uniforms.uPointerStrength!.value as number
    if (pointer && strength > 0.001) {
      this.local.copy(pointer)
      this.points.worldToLocal(this.local)
      if (this.hasPointer && delta > 0) {
        const vel = this.lastPointer.sub(this.local).multiplyScalar(-1 / Math.max(delta * 60, 0.5))
        this.pointerVelocity.lerp(vel, 0.3)
      }
      this.lastPointer.copy(this.local)
      this.hasPointer = true
      ;(v.uPointer!.value as Vector3).copy(this.local)
      // uPointerStrength rises to about 0.45 while the pointer is active (set by the World)
      v.uPointerStrength!.value =
        ph.pointerStrength *
        (strength / 0.45) *
        (1 + Math.min(this.pointerVelocity.length() * 8, 1.5))
      v.uPointerRadius!.value = this.uniforms.uPointerRadius!.value
      ;(v.uPointerVelocity!.value as Vector3).copy(this.pointerVelocity)
    } else {
      this.hasPointer = false
      this.pointerVelocity.multiplyScalar(0.9)
      ;(v.uPointer!.value as Vector3).set(999, 999, 999)
      ;(v.uPointerVelocity!.value as Vector3).set(0, 0, 0)
    }

    gpu.compute()
    this.uniforms.uPositions!.value = gpu.getCurrentRenderTarget(this.position).texture
  }

  /** Colours from the (tweened) theme palette */
  applyPalette(palette: Palette) {
    const { colors, values } = palette
    const { uColorA, uColorB, uColorC, uSparkColor, uSparkRatio, uIntensity, uGlow, uSpecular } =
      this.uniforms
    // The logo's three colours
    ;(uColorA!.value as Vector3).set(colors.logoA.r, colors.logoA.g, colors.logoA.b)
    ;(uColorB!.value as Vector3).set(colors.logoB.r, colors.logoB.g, colors.logoB.b)
    ;(uColorC!.value as Vector3).set(colors.logoC.r, colors.logoC.g, colors.logoC.b)
    ;(uSparkColor!.value as Vector3).set(colors.spark.r, colors.spark.g, colors.spark.b)
    uSparkRatio!.value = 0.035 + palette.darkness * 0.015
    uIntensity!.value = values.intensity
    // A brighter core and glint on dark backgrounds, where bloom picks them up
    uGlow!.value = 0.25 + palette.darkness * 0.35
    uSpecular!.value = 0.5 + palette.darkness * 0.3
  }

  dispose() {
    this.tweens.forEach((t) => t.kill())
    this.scene.remove(this.points)
    this.geometry.dispose()
    this.material.dispose()
    this.gpu?.dispose()
    this.target?.dispose()
    this.pendingReveal?.dispose()
  }

  // ------------------------------------------------------------------ internals

  private startMorph(target: DataTexture, instant: boolean, burstScale: number) {
    this.setTarget(target)
    this.tweens.forEach((t) => t.kill())
    this.tweens = []
    if (instant) {
      this.placeOnTarget()
      this.uniforms.uProgress!.value = 1
      this.burst.value = 0
      this.morphTime = 10
      return
    }
    this.morphTime = 0
    this.uniforms.uProgress!.value = 0
    this.tweens.push(
      gsap.to(this.uniforms.uProgress!, { value: 1, duration: MORPH_DURATION, ease: 'none' }),
      gsap
        .timeline()
        .to(this.burst, {
          value: this.physics.burstPeak * burstScale,
          duration: BURST_DURATION * 0.3,
          ease: 'power2.out',
        })
        .to(this.burst, { value: 0, duration: BURST_DURATION * 0.7, ease: 'power2.in' })
    )
  }

  private setTarget(texture: DataTexture) {
    this.target?.dispose()
    this.target = texture
    if (this.velocity) this.velocity.material.uniforms.uTarget!.value = texture
  }

  /** Puts every particle exactly on its target, at rest (reduced motion, instant morphs) */
  private placeOnTarget() {
    if (!this.gpu || !this.position || !this.velocity || !this.target) return
    const zero = this.gpu.createTexture()
    for (const rt of this.position.renderTargets) this.gpu.renderTexture(this.target, rt)
    for (const rt of this.velocity.renderTargets) this.gpu.renderTexture(zero, rt)
    zero.dispose()
    this.uniforms.uPositions!.value = this.gpu.getCurrentRenderTarget(this.position).texture
  }

  /** Creates the simulation (size × size particles) starting from `start` positions */
  private allocate(size: number, start: Float32Array) {
    this.gpu?.dispose()
    this.size = size
    this.count = size * size
    this.still = false

    const gpu = new GPUComputationRenderer(size, size, this.renderer)
    // Full float where the GPU can render to it, half float elsewhere (older phones)
    const full = !!this.renderer.extensions.get('EXT_color_buffer_float')
    gpu.setDataType(full ? FloatType : HalfFloatType)

    const positionTex = gpu.createTexture()
    const velocityTex = gpu.createTexture()
    const rand = createRandom(23)
    this.hashes = new Float32Array(this.count)
    for (let i = 0; i < this.count; i++) this.hashes[i] = rand()
    const pos = positionTex.image.data as Float32Array
    for (let i = 0; i < this.count; i++) {
      pos[i * 4] = start[i * 3]!
      pos[i * 4 + 1] = start[i * 3 + 1]!
      pos[i * 4 + 2] = start[i * 3 + 2]!
      pos[i * 4 + 3] = this.hashes[i]!
    }

    this.velocity = gpu.addVariable('textureVelocity', simVelocity, velocityTex)
    this.position = gpu.addVariable('texturePosition', simPosition, positionTex)
    gpu.setVariableDependencies(this.velocity, [this.position, this.velocity])
    gpu.setVariableDependencies(this.position, [this.position, this.velocity])
    Object.assign(this.velocity.material.uniforms, {
      uTarget: { value: this.target },
      uDelta: { value: 0 },
      uTime: { value: 0 },
      uSpring: { value: PHYSICS.spring },
      uDamping: { value: PHYSICS.damping },
      uFlowStrength: { value: PHYSICS.flowStrength },
      uFlowScale: { value: PHYSICS.flowScale },
      uFlowSpeed: { value: PHYSICS.flowSpeed },
      uPulse: { value: PHYSICS.pulse },
      uBurst: { value: 0 },
      uMorphTime: { value: 10 },
      uPointer: { value: new Vector3(999, 999, 999) },
      uPointerVelocity: { value: new Vector3() },
      uPointerRadius: { value: PHYSICS.pointerRadius },
      uPointerStrength: { value: 0 },
    })
    Object.assign(this.position.material.uniforms, { uDelta: { value: 0 } })
    const error = gpu.init()
    if (error) console.warn('[webgl] Particle simulation failed to start', error)
    this.gpu = gpu
    this.uniforms.uPositions!.value = gpu.getCurrentRenderTarget(this.position).texture

    // One point per particle; aRef points at its texel in the simulation textures
    const refs = new Float32Array(this.count * 2)
    const params = new Float32Array(this.count * 3)
    const prand = createRandom(11)
    for (let i = 0; i < this.count; i++) {
      refs[i * 2] = ((i % size) + 0.5) / size
      refs[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size
      const big = prand() < 0.04
      params[i * 3] = prand()
      params[i * 3 + 1] = big ? 1.6 + prand() * 0.6 : 0.7 + prand() * 0.6
      params[i * 3 + 2] = prand() // which of the three logo colours (see the fragment shader)
    }
    this.geometry.dispose()
    this.geometry = new BufferGeometry()
    this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.count * 3), 3))
    this.geometry.setAttribute('aRef', new BufferAttribute(refs, 2))
    this.geometry.setAttribute('aParams', new BufferAttribute(params, 3))
    this.points.geometry = this.geometry
  }

  /** xyz points → a size × size RGBA texture the simulation can read */
  private pack(points: Float32Array) {
    const texture = this.gpu!.createTexture()
    const data = texture.image.data as Float32Array
    for (let i = 0; i < this.count; i++) {
      data[i * 4] = points[i * 3] ?? 0
      data[i * 4 + 1] = points[i * 3 + 1] ?? 0
      data[i * 4 + 2] = points[i * 3 + 2] ?? 0
      data[i * 4 + 3] = this.hashes[i] ?? 0
    }
    texture.needsUpdate = true
    return texture
  }
}

/** A loose sphere of particles: the state before the first shape forms */
function cloud(count: number) {
  const rand = createRandom(99)
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const [x, y, z] = onSphere(rand)
    const r = INTRO_CLOUD_RADIUS * Math.cbrt(rand())
    out[i * 3] = x * r
    out[i * 3 + 1] = y * r
    out[i * 3 + 2] = z * r * 0.6
  }
  return out
}
