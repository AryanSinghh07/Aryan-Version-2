import {
  Camera,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NoBlending,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three'
import type { IUniform, WebGLRenderer } from 'three'
import type { QualityTier } from '../config/quality'
import advection from '../shaders/fluid/advection.glsl'
import curl from '../shaders/fluid/curl.glsl'
import divergence from '../shaders/fluid/divergence.glsl'
import gradientSubtract from '../shaders/fluid/gradient-subtract.glsl'
import pressure from '../shaders/fluid/pressure.glsl'
import scale from '../shaders/fluid/scale.glsl'
import splat from '../shaders/fluid/splat.glsl'
import vertexShader from '../shaders/fluid/vertex.glsl'
import vorticity from '../shaders/fluid/vorticity.glsl'

/** Grid sizes (short side, in cells) and solver iterations per quality tier */
const RESOLUTION: Partial<Record<QualityTier, { sim: number; dye: number; iterations: number }>> = {
  high: { sim: 128, dye: 512, iterations: 20 },
  medium: { sim: 96, dye: 256, iterations: 12 },
}

const SETTINGS = {
  /** How fast the smoke fades (per second) */
  densityDissipation: 1.2,
  /** How fast the motion settles */
  velocityDissipation: 0.6,
  /** Pressure kept from the previous frame, as a head start for the solver */
  pressure: 0.8,
  /** Swirl strength */
  curl: 20,
  /** Pointer splat size and push */
  radius: 0.0025,
  force: 3000,
  /** Smoke added per frame at full pointer speed */
  density: 0.16,
  /** Pointer speed (screen heights per second) that counts as full speed */
  fullSpeed: 1.2,
  /** Stop simulating once the pointer has rested this long (seconds) and the smoke is gone */
  idleAfter: 5,
}

type Pass = ShaderMaterial & { uniforms: Record<string, IUniform> }

class DoubleTarget {
  read: WebGLRenderTarget
  write: WebGLRenderTarget
  texel = new Vector2()

  constructor(width: number, height: number) {
    this.read = createTarget(width, height)
    this.write = createTarget(width, height)
    this.texel.set(1 / width, 1 / height)
  }

  swap() {
    const t = this.read
    this.read = this.write
    this.write = t
  }

  dispose() {
    this.read.dispose()
    this.write.dispose()
  }
}

function createTarget(width: number, height: number) {
  return new WebGLRenderTarget(width, height, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

/** Grid size for a target resolution, keeping the screen's aspect ratio */
function gridSize(resolution: number, width: number, height: number) {
  const aspect = Math.max(width, height) / Math.max(Math.min(width, height), 1)
  const long = Math.round(resolution * aspect)
  return width >= height ? [long, resolution] : [resolution, long]
}

interface Targets {
  velocity: DoubleTarget
  dye: DoubleTarget
  pressure: DoubleTarget
  divergence: WebGLRenderTarget
  curl: WebGLRenderTarget
  key: string
}

/**
 * GPU stable-fluids smoke that trails the pointer (advection, splat, curl and vorticity,
 * divergence, pressure, gradient subtract, in ping-pong render targets). Only the smoke
 * density is drawn: PostProcessing tints the scene with it (shaders/post/fluid.glsl).
 * Runs on High and Medium; Low and reduced motion turn it off. The grids are small, and the
 * simulation sleeps once the pointer rests and the smoke has faded.
 */
export class Fluid {
  enabled = false
  /** Live settings (tunable from the #debug panel) */
  settings = { ...SETTINGS }
  /** Smoke density texture for the composite (null when the fluid is off) */
  get texture() {
    return this.targets?.dye.read.texture ?? null
  }

  private targets: Targets | null = null
  private tier: QualityTier | null = null
  private scene = new Scene()
  private camera = new Camera()
  private quad: Mesh<PlaneGeometry, ShaderMaterial>
  private passes: Record<
    'splat' | 'advection' | 'divergence' | 'curl' | 'vorticity' | 'pressure' | 'gradient' | 'scale',
    Pass
  >
  private last = new Vector2()
  private hasLast = false
  private idle = Infinity
  private width = 1
  private height = 1

  constructor(private renderer: WebGLRenderer) {
    const pass = (fragmentShader: string, uniforms: Record<string, IUniform>) =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { texelSize: { value: new Vector2() }, ...uniforms },
        depthTest: false,
        depthWrite: false,
        blending: NoBlending,
      }) as Pass

    this.passes = {
      splat: pass(splat, {
        uTarget: { value: null },
        aspectRatio: { value: 1 },
        color: { value: new Vector3() },
        point: { value: new Vector2() },
        radius: { value: this.settings.radius },
      }),
      advection: pass(advection, {
        uVelocity: { value: null },
        uSource: { value: null },
        dt: { value: 0 },
        dissipation: { value: 0 },
      }),
      divergence: pass(divergence, { uVelocity: { value: null } }),
      curl: pass(curl, { uVelocity: { value: null } }),
      vorticity: pass(vorticity, {
        uVelocity: { value: null },
        uCurl: { value: null },
        curl: { value: this.settings.curl },
        dt: { value: 0 },
      }),
      pressure: pass(pressure, { uPressure: { value: null }, uDivergence: { value: null } }),
      gradient: pass(gradientSubtract, { uPressure: { value: null }, uVelocity: { value: null } }),
      scale: pass(scale, { uTexture: { value: null }, value: { value: this.settings.pressure } }),
    }

    this.quad = new Mesh(new PlaneGeometry(2, 2), this.passes.splat)
    this.quad.frustumCulled = false
    this.scene.add(this.quad)
  }

  setQuality(tier: QualityTier) {
    this.tier = tier
    this.allocate()
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.allocate()
  }

  /**
   * Advances the simulation by one frame.
   * @param pointer pointer position in 0..1 screen coordinates (y up), or null when inactive
   */
  update(delta: number, pointer: Vector2 | null, on: boolean) {
    const t = this.targets
    this.enabled = on && !!t
    if (!t || !on) {
      this.hasLast = false
      return
    }
    const dt = Math.min(delta, 1 / 30)
    if (dt <= 0) return

    if (pointer) {
      if (this.hasLast) this.pointerSplat(t, pointer, dt)
      this.last.copy(pointer)
      this.hasLast = true
    } else {
      this.hasLast = false
    }

    // Asleep: nothing moving and the smoke has faded. Counted in real time (the simulation
    // step is capped, so on a slow device it would take longer than idleAfter seconds).
    this.idle += delta
    if (this.idle > this.settings.idleAfter) return
    this.step(t, dt)
  }

  /** True while there is smoke worth drawing */
  get visible() {
    return this.enabled && this.idle <= this.settings.idleAfter
  }

  private pointerSplat(t: Targets, pointer: Vector2, dt: number) {
    let dx = pointer.x - this.last.x
    let dy = pointer.y - this.last.y
    // A jump (touch somewhere else, pointer returning to the window) is not a stroke
    if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2 || (dx === 0 && dy === 0)) return

    const aspect = this.width / Math.max(this.height, 1)
    // Pointer speed in screen heights per second
    const speed = Math.hypot(dx * aspect, dy) / dt
    // The push in grid units, so a stroke pushes the same way across and down the screen
    if (aspect < 1) dx *= aspect
    if (aspect > 1) dy /= aspect
    const amount =
      Math.min(speed / this.settings.fullSpeed, 1) * this.settings.density * Math.min(dt * 60, 2)
    const radius = this.settings.radius * (aspect > 1 ? aspect : 1)

    const s = this.passes.splat.uniforms
    s.aspectRatio!.value = aspect
    s.radius!.value = radius
    ;(s.point!.value as Vector2).copy(pointer)

    s.uTarget!.value = t.velocity.read.texture
    ;(s.color!.value as Vector3).set(dx * this.settings.force, dy * this.settings.force, 0)
    this.blit(t.velocity.write, this.passes.splat, t.velocity.texel)
    t.velocity.swap()

    s.uTarget!.value = t.dye.read.texture
    ;(s.color!.value as Vector3).set(amount, amount, amount)
    this.blit(t.dye.write, this.passes.splat, t.dye.texel)
    t.dye.swap()

    this.idle = 0
  }

  private step(t: Targets, dt: number) {
    const p = this.passes
    const texel = t.velocity.texel

    p.curl.uniforms.uVelocity!.value = t.velocity.read.texture
    this.blit(t.curl, p.curl, texel)

    p.vorticity.uniforms.uVelocity!.value = t.velocity.read.texture
    p.vorticity.uniforms.uCurl!.value = t.curl.texture
    p.vorticity.uniforms.dt!.value = dt
    p.vorticity.uniforms.curl!.value = this.settings.curl
    this.blit(t.velocity.write, p.vorticity, texel)
    t.velocity.swap()

    p.divergence.uniforms.uVelocity!.value = t.velocity.read.texture
    this.blit(t.divergence, p.divergence, texel)

    p.scale.uniforms.uTexture!.value = t.pressure.read.texture
    p.scale.uniforms.value!.value = this.settings.pressure
    this.blit(t.pressure.write, p.scale, texel)
    t.pressure.swap()

    p.pressure.uniforms.uDivergence!.value = t.divergence.texture
    const iterations = RESOLUTION[this.tier ?? 'high']?.iterations ?? 12
    for (let i = 0; i < iterations; i++) {
      p.pressure.uniforms.uPressure!.value = t.pressure.read.texture
      this.blit(t.pressure.write, p.pressure, texel)
      t.pressure.swap()
    }

    p.gradient.uniforms.uPressure!.value = t.pressure.read.texture
    p.gradient.uniforms.uVelocity!.value = t.velocity.read.texture
    this.blit(t.velocity.write, p.gradient, texel)
    t.velocity.swap()

    const a = p.advection.uniforms
    a.dt!.value = dt
    a.uVelocity!.value = t.velocity.read.texture
    a.uSource!.value = t.velocity.read.texture
    a.dissipation!.value = this.settings.velocityDissipation
    this.blit(t.velocity.write, p.advection, texel)
    t.velocity.swap()

    a.uVelocity!.value = t.velocity.read.texture
    a.uSource!.value = t.dye.read.texture
    a.dissipation!.value = this.settings.densityDissipation
    // Same step size as the velocity grid, so smoke moves with the flow at either resolution
    this.blit(t.dye.write, p.advection, texel)
    t.dye.swap()

    this.renderer.setRenderTarget(null)
  }

  private blit(target: WebGLRenderTarget, material: Pass, texel: Vector2) {
    ;(material.uniforms.texelSize!.value as Vector2).copy(texel)
    this.quad.material = material
    this.renderer.setRenderTarget(target)
    this.renderer.render(this.scene, this.camera)
  }

  /** Creates the grids for the current tier and screen size (and frees them when off) */
  private allocate() {
    const res = this.tier ? RESOLUTION[this.tier] : undefined
    if (!res) {
      this.freeTargets()
      return
    }
    const [sw, sh] = gridSize(res.sim, this.width, this.height)
    const [dw, dh] = gridSize(res.dye, this.width, this.height)
    const key = `${sw}x${sh}/${dw}x${dh}`
    if (this.targets?.key === key) return
    this.freeTargets()
    this.targets = {
      velocity: new DoubleTarget(sw!, sh!),
      dye: new DoubleTarget(dw!, dh!),
      pressure: new DoubleTarget(sw!, sh!),
      divergence: createTarget(sw!, sh!),
      curl: createTarget(sw!, sh!),
      key,
    }
    this.idle = Infinity
    this.hasLast = false
  }

  private freeTargets() {
    const t = this.targets
    if (!t) return
    t.velocity.dispose()
    t.dye.dispose()
    t.pressure.dispose()
    t.divergence.dispose()
    t.curl.dispose()
    this.targets = null
    this.enabled = false
  }

  dispose() {
    this.freeTargets()
    this.quad.geometry.dispose()
    for (const pass of Object.values(this.passes)) pass.dispose()
  }
}
