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
import { FLOOR_Y } from '../config/scenes'
import type { Palette } from '../core/Palette'
import fragmentShader from '../shaders/sparkles/fragment.glsl'
import vertexShader from '../shaders/sparkles/vertex.glsl'
import { createRandom } from '../shapes/random'

/**
 * Depth for the world: small sparkles drifting through a wide volume (a few in the accent
 * colour), plus fireflies near the logo with a glowing core. One draw call for both. Counts
 * come from the quality tier.
 */
export class Sparkles {
  points: Points<BufferGeometry, ShaderMaterial>
  private key = ''

  constructor(private scene: Scene) {
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.03 },
        uResolutionY: { value: 1 },
        uColor: { value: new Vector3() },
        uAccent: { value: new Vector3() },
        uOpacity: { value: 1 },
        uAccentRatio: { value: 0.08 },
      },
    })
    this.points = new Points(new BufferGeometry(), material)
    this.points.name = 'sparkles'
    this.points.frustumCulled = false
    scene.add(this.points)
  }

  setQuality(sparkles: number, fireflies: number) {
    const key = `${sparkles}/${fireflies}`
    if (key === this.key) return
    this.key = key
    const rand = createRandom(31)
    const total = sparkles + fireflies
    const seeds = new Float32Array(total * 4)
    for (let i = 0; i < total; i++) {
      const firefly = i >= sparkles
      if (firefly) {
        // Close to the logo
        seeds[i * 4] = (rand() - 0.5) * 10
        seeds[i * 4 + 1] = FLOOR_Y + 0.6 + rand() * 4
        seeds[i * 4 + 2] = (rand() - 0.5) * 6
      } else {
        // Throughout the world, mostly behind the logo
        seeds[i * 4] = (rand() - 0.5) * 34
        seeds[i * 4 + 1] = FLOOR_Y + 0.2 + rand() * 10
        seeds[i * 4 + 2] = -16 + rand() * 22
      }
      seeds[i * 4 + 3] = rand() * 0.999 + (firefly ? 1 : 0)
    }
    this.points.geometry.dispose()
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(total * 3), 3))
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4))
    this.points.geometry = geometry
  }

  update(
    palette: Palette,
    elapsed: number,
    resolutionY: number,
    opacity: number,
    reduced: boolean
  ) {
    const u = this.points.material.uniforms
    const { colors } = palette
    u.uTime!.value = reduced ? 0 : elapsed
    u.uResolutionY!.value = resolutionY
    // Glow adds up on dark backgrounds; on light ones it would wash out, so blend normally
    // (and use the deeper violet, which shows against a pale sky)
    const dark = palette.darkness > 0.5
    const base = dark ? colors.particleB : colors.particleA
    ;(u.uColor!.value as Vector3).set(base.r, base.g, base.b)
    ;(u.uAccent!.value as Vector3).set(colors.spark.r, colors.spark.g, colors.spark.b)
    this.points.material.blending = dark ? AdditiveBlending : NormalBlending
    u.uOpacity!.value = opacity * (dark ? 0.9 : 0.55)
  }

  dispose() {
    this.scene.remove(this.points)
    this.points.geometry.dispose()
    this.points.material.dispose()
  }
}
