import { BufferAttribute, BufferGeometry, Mesh, ShaderMaterial, Vector2, Vector3 } from 'three'
import type { Scene } from 'three'
import type { Palette } from '../core/Palette'
import fragmentShader from '../shaders/background/fragment.glsl'
import vertexShader from '../shaders/background/vertex.glsl'

/**
 * Full-screen gradient behind everything, in the theme's colours, with a soft glow that sits
 * behind the particles. Drawn first, never depth-tested, so it is always the backdrop.
 */
export class Background {
  mesh: Mesh<BufferGeometry, ShaderMaterial>

  constructor(private scene: Scene) {
    // One triangle bigger than the screen covers it completely
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
    )
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTop: { value: new Vector3() },
        uBottom: { value: new Vector3() },
        uGlow: { value: new Vector3() },
        uGlowCenter: { value: new Vector2(0.5, 0.5) },
        uAspect: { value: 1 },
      },
    })
    this.mesh = new Mesh(geometry, material)
    this.mesh.name = 'background'
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -1000
    scene.add(this.mesh)
  }

  /** @param glowCenter where the particles are, in 0..1 screen coordinates */
  update(palette: Palette, glowCenter: Vector2, aspect: number) {
    const u = this.mesh.material.uniforms
    const { colors } = palette
    ;(u.uTop!.value as Vector3).set(colors.background.r, colors.background.g, colors.background.b)
    ;(u.uBottom!.value as Vector3).set(
      colors.backgroundEnd.r,
      colors.backgroundEnd.g,
      colors.backgroundEnd.b
    )
    ;(u.uGlow!.value as Vector3).set(colors.glow.r, colors.glow.g, colors.glow.b)
    ;(u.uGlowCenter!.value as Vector2).lerp(glowCenter, 0.08)
    u.uAspect!.value = aspect
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
