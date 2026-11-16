import { BackSide, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three'
import type { Scene } from 'three'
import type { Palette } from '../core/Palette'
import fragmentShader from '../shaders/sky/fragment.glsl'
import vertexShader from '../shaders/sky/vertex.glsl'

const RADIUS = 60

/**
 * The sky: a large dome that travels with the camera (so it is never reached), in the
 * theme's colours with soft drifting clouds and a glow behind the logo. Drawn first and never
 * depth-tested, so everything else sits in front of it.
 */
export class Sky {
  mesh: Mesh<SphereGeometry, ShaderMaterial>
  private logoDir = new Vector3()

  constructor(private scene: Scene) {
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: BackSide,
      depthTest: false,
      depthWrite: false,
      fog: false,
      uniforms: {
        uHorizon: { value: new Vector3() },
        uMid: { value: new Vector3() },
        uHigh: { value: new Vector3() },
        uTop: { value: new Vector3() },
        uCloudColor: { value: new Vector3() },
        uGlow: { value: new Vector3() },
        uLogoDir: { value: new Vector3(0, 0, -1) },
        uTime: { value: 0 },
        uCloud: { value: 0.8 },
      },
    })
    this.mesh = new Mesh(new SphereGeometry(RADIUS, 48, 24), material)
    this.mesh.name = 'sky'
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -1000
    scene.add(this.mesh)
  }

  update(
    palette: Palette,
    cameraPosition: Vector3,
    logo: Vector3,
    elapsed: number,
    reduced: boolean
  ) {
    this.mesh.position.copy(cameraPosition)
    const u = this.mesh.material.uniforms
    const { colors } = palette
    const set = (name: string, c: { r: number; g: number; b: number }) =>
      (u[name]!.value as Vector3).set(c.r, c.g, c.b)
    set('uHorizon', colors.skyHorizon)
    set('uMid', colors.skyMid)
    set('uHigh', colors.skyHigh)
    set('uTop', colors.skyTop)
    ;(u.uCloudColor!.value as Vector3).set(colors.surface.r, colors.surface.g, colors.surface.b)
    ;(u.uGlow!.value as Vector3).set(colors.glow.r, colors.glow.g, colors.glow.b)
    this.logoDir.copy(logo).sub(cameraPosition).normalize()
    ;(u.uLogoDir!.value as Vector3).copy(this.logoDir)
    u.uTime!.value = reduced ? 0 : elapsed
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
