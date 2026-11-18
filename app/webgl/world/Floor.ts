import { CircleGeometry, Color, Matrix4, Mesh, ShaderMaterial, Vector3 } from 'three'
import type { Object3D, Scene } from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import type { QualitySettings } from '../config/quality'
import { lookColor, lookNumber } from '../config/landscape'
import { FLOOR_Y } from '../config/scenes'
import type { Palette } from '../core/Palette'
import fragmentShader from '../shaders/floor/fragment.glsl'
import vertexShader from '../shaders/floor/vertex.glsl'

/** The lake: radius 60 in the Blender scene, scaled with the landscape */
const S = 8.4 / 45
const RADIUS = 60 * S
/** Mirror image resolution relative to the screen: the lake ripples, so a soft image is fine */
const REFLECT_SCALE = 0.35

type FloorMode = QualitySettings['floor']

/**
 * The lake under the logo. High quality: a real mirror (Reflector, about a third of the resolution)
 * bent by layered waves and spreading rings. Medium and Low: a glossy floor with a sheen under the logo, no extra render.
 * It fades out with distance into the sky.
 */
export class Floor {
  private mesh: Mesh<CircleGeometry, ShaderMaterial> | Reflector | null = null
  private mode: FloorMode | null = null
  private opacity = 0
  private tmp = new Color()

  constructor(
    private scene: Scene,
    /** Hidden while the mirror image renders (glass that refracts would render yet again) */
    private hideInReflection: () => Object3D[]
  ) {}

  setQuality(mode: FloorMode, width: number, height: number, pixelRatio: number) {
    if (mode === this.mode) return
    this.mode = mode
    this.remove()
    if (mode === 'none') return

    const geometry = new CircleGeometry(RADIUS, 96)
    const uniforms = {
      tDiffuse: { value: null },
      color: { value: new Vector3() },
      textureMatrix: { value: new Matrix4() },
      uReflect: { value: mode === 'reflect' ? 1 : 0 },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uFloor: { value: new Vector3() },
      uDeep: { value: new Vector3() },
      uGlint: { value: new Vector3() },
      uRipple: { value: 0.014 },
      uScale: { value: S },
      uSheen: { value: new Vector3() },
      uCenter: { value: new Vector3() },
    }

    if (mode === 'reflect') {
      const reflector = new Reflector(geometry, {
        textureWidth: Math.round(width * pixelRatio * REFLECT_SCALE),
        textureHeight: Math.round(height * pixelRatio * REFLECT_SCALE),
        clipBias: 0.003,
        shader: { name: 'FloorShader', uniforms, vertexShader, fragmentShader },
      })
      const material = reflector.material as ShaderMaterial
      material.transparent = true
      material.depthWrite = false
      // Keep refracting glass and the Work carousel out of the mirror image
      const render = reflector.onBeforeRender.bind(reflector)
      reflector.onBeforeRender = (...args: Parameters<typeof render>) => {
        const hidden = this.hideInReflection().filter((o) => o.visible)
        hidden.forEach((o) => (o.visible = false))
        render(...args)
        hidden.forEach((o) => (o.visible = true))
      }
      this.mesh = reflector
    } else {
      const material = new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
      })
      this.mesh = new Mesh(geometry, material)
    }
    this.mesh.name = 'floor'
    this.mesh.rotation.x = -Math.PI / 2
    this.mesh.position.y = FLOOR_Y
    this.mesh.renderOrder = -500
    this.scene.add(this.mesh)
  }

  resize(width: number, height: number, pixelRatio: number) {
    if (this.mesh instanceof Reflector) {
      this.mesh
        .getRenderTarget()
        .setSize(
          Math.round(width * pixelRatio * REFLECT_SCALE),
          Math.round(height * pixelRatio * REFLECT_SCALE)
        )
    }
  }

  update(palette: Palette, logo: Vector3, elapsed: number, visible: boolean, delta: number) {
    if (!this.mesh) return
    this.opacity += ((visible ? 1 : 0) - this.opacity) * Math.min(1, delta * 3)
    this.mesh.visible = this.opacity > 0.01
    const u = (this.mesh.material as ShaderMaterial).uniforms
    const { colors } = palette
    // The lake's colour per theme; the sheen picks up the glow colour
    ;(u.uFloor!.value as Vector3).set(colors.lake.r, colors.lake.g, colors.lake.b)
    ;(u.uSheen!.value as Vector3).set(colors.glow.r, colors.glow.g, colors.glow.b)
    const d = palette.darkness
    lookColor('lakeDeep', d, this.tmp)
    ;(u.uDeep!.value as Vector3).set(this.tmp.r, this.tmp.g, this.tmp.b)
    lookColor('waveGlint', d, this.tmp)
    ;(u.uGlint!.value as Vector3).set(this.tmp.r, this.tmp.g, this.tmp.b)
    u.uRipple!.value = lookNumber('ripple', d)
    ;(u.uCenter!.value as Vector3).set(logo.x, FLOOR_Y, logo.z)
    u.uTime!.value = elapsed
    u.uOpacity!.value = this.opacity * 0.9
  }

  private remove() {
    if (!this.mesh) return
    this.scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    if (this.mesh instanceof Reflector) this.mesh.dispose()
    else (this.mesh.material as ShaderMaterial).dispose()
    this.mesh = null
  }

  dispose() {
    this.remove()
  }
}
