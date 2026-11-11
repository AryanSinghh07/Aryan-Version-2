import { gsap } from 'gsap'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { Scene } from 'three'
import { INTRO_CLOUD_RADIUS } from '../config/scenes'
import type { Palette } from '../core/Palette'
import fragmentShader from '../shaders/particles/fragment.glsl'
import vertexShader from '../shaders/particles/vertex.glsl'
import { createRandom, onSphere } from '../shapes/random'
import type { ShapeLibrary } from '../shapes/ShapeLibrary'

/** Fraction of the morph over which particle start times are spread (matches the shader) */
const DELAY_SPREAD = 0.4
const MORPH_DURATION = 1.6

/**
 * The glowing particle cloud. Every shape has the same number of points, so a morph is just
 * "each particle moves from its point in the old shape to its point in the new one".
 * Interrupting a morph is safe: the particles' current positions become the new start.
 */
export class Particles {
  points: Points<BufferGeometry, ShaderMaterial>
  count = 0
  /** The shape the particles are heading to (or sitting in) */
  shape: string | null = null

  private geometry = new BufferGeometry()
  private material: ShaderMaterial
  private morph: gsap.core.Tween | null = null
  private request = 0
  private pendingCount = 0

  constructor(
    private scene: Scene,
    private library: ShapeLibrary
  ) {
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uDelaySpread: { value: DELAY_SPREAD },
        uDrift: { value: 0.035 },
        uScatter: { value: 0.55 },
        uSize: { value: 0.045 },
        uResolutionY: { value: 1 },
        uPointer: { value: new Vector3(999, 999, 0) },
        uPointerRadius: { value: 0.9 },
        uPointerStrength: { value: 0 },
        uSparkRatio: { value: 0.03 },
        uColorA: { value: new Vector3() },
        uColorB: { value: new Vector3() },
        uSparkColor: { value: new Vector3() },
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
    const target = await this.library.get(shape, count)
    this.allocate(count)
    this.attr('aFrom').set(cloud(count))
    this.attr('aTo').set(target)
    this.markDirty()
    this.uniforms.uProgress!.value = 0
    this.shape = shape
  }

  /** Forms the first shape out of the loading cloud */
  reveal(instant = false) {
    this.morph?.kill()
    if (instant) {
      this.uniforms.uProgress!.value = 1
      return
    }
    this.morph = gsap.to(this.uniforms.uProgress!, { value: 1, duration: 2.4, ease: 'none' })
  }

  /** Moves every particle to `shape`. Safe to call mid-morph. */
  async morphTo(shape: string, instant = false) {
    if (shape === this.shape) return
    this.shape = shape
    const request = ++this.request
    const target = await this.library.get(shape, this.count)
    if (request !== this.request) return // a newer request replaced this one

    this.snapshotInto(this.attr('aFrom'))
    this.attr('aTo').set(target)
    this.markDirty()
    this.morph?.kill()
    this.uniforms.uProgress!.value = instant ? 1 : 0
    if (!instant) {
      this.morph = gsap.to(this.uniforms.uProgress!, {
        value: 1,
        duration: MORPH_DURATION,
        ease: 'none', // each particle eases on its own in the shader
      })
    }
  }

  /** Rebuilds with a new particle count (quality change), keeping the current shape */
  async setCount(count: number) {
    // Called every frame until done: ignore repeats while a rebuild is on its way
    if (count === this.count || count === this.pendingCount || !this.shape) return
    this.pendingCount = count
    const shape = this.shape
    const request = ++this.request
    const target = await this.library.get(shape, count)
    this.pendingCount = 0
    // A morph replaced this rebuild: the next frame asks again with the new shape
    if (request !== this.request) return
    this.morph?.kill()
    this.allocate(count)
    this.attr('aFrom').set(target)
    this.attr('aTo').set(target)
    this.markDirty()
    this.uniforms.uProgress!.value = 1
  }

  /** Colours, glow strength and blending from the (tweened) theme palette */
  applyPalette(palette: Palette) {
    const { colors, values } = palette
    const { uColorA, uColorB, uSparkColor, uSparkRatio, uIntensity } = this.uniforms
    ;(uColorA!.value as Vector3).set(colors.particleA.r, colors.particleA.g, colors.particleA.b)
    ;(uColorB!.value as Vector3).set(colors.particleB.r, colors.particleB.g, colors.particleB.b)
    ;(uSparkColor!.value as Vector3).set(colors.spark.r, colors.spark.g, colors.spark.b)
    uSparkRatio!.value = 0.03 + palette.darkness * 0.02
    uIntensity!.value = values.intensity
    // Glow adds up on dark backgrounds; on light ones it would wash out to white.
    // Switches halfway through a theme fade.
    this.material.blending = palette.darkness > 0.5 ? AdditiveBlending : NormalBlending
  }

  dispose() {
    this.morph?.kill()
    this.scene.remove(this.points)
    this.geometry.dispose()
    this.material.dispose()
  }

  // ------------------------------------------------------------------ internals

  private allocate(count: number) {
    this.count = count
    const rand = createRandom(11)
    const params = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      const big = rand() < 0.04
      params[i * 4] = rand() // random
      params[i * 4 + 1] = big ? 1.8 + rand() * 0.8 : 0.55 + rand() * 0.8 // size
      params[i * 4 + 2] = rand() // delay
      params[i * 4 + 3] = Math.pow(rand(), 1.6) // colour mix, mostly the main violet
    }
    this.geometry.dispose()
    this.geometry = new BufferGeometry()
    this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    this.geometry.setAttribute('aFrom', new BufferAttribute(new Float32Array(count * 3), 3))
    this.geometry.setAttribute('aTo', new BufferAttribute(new Float32Array(count * 3), 3))
    this.geometry.setAttribute('aParams', new BufferAttribute(params, 4))
    this.points.geometry = this.geometry
  }

  private attr(name: 'aFrom' | 'aTo' | 'aParams') {
    return this.geometry.getAttribute(name) as BufferAttribute & { array: Float32Array }
  }

  private markDirty() {
    this.attr('aFrom').needsUpdate = true
    this.attr('aTo').needsUpdate = true
  }

  /** Writes where each particle is right now (same maths as the shader, without the noise) */
  private snapshotInto(out: BufferAttribute & { array: Float32Array }) {
    const from = this.attr('aFrom').array
    const to = this.attr('aTo').array
    const params = this.attr('aParams').array
    const progress = this.uniforms.uProgress!.value as number
    const result = new Float32Array(from.length)
    for (let i = 0; i < this.count; i++) {
      const delay = params[i * 4 + 2]! * DELAY_SPREAD
      const p = easeInOutCubic(Math.min(Math.max((progress - delay) / (1 - DELAY_SPREAD), 0), 1))
      for (let a = 0; a < 3; a++) {
        const k = i * 3 + a
        result[k] = from[k]! + (to[k]! - from[k]!) * p
      }
    }
    out.array.set(result)
  }
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
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
