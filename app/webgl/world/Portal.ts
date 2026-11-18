import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from 'three'
import type { PerspectiveCamera, Scene } from 'three'
import fragmentShader from '../shaders/portal/fragment.glsl'
import vertexShader from '../shaders/portal/vertex.glsl'

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

/**
 * The portal that ends the home hero: a dark core with a smoky edge and a soft white halo,
 * drawn over the landscape (but under the particles) and centred on the ring. Driven by the
 * outro progress: it opens behind the growing ring, swallows the screen, then fades away to
 * reveal the page beyond.
 */
export class Portal {
  mesh: Mesh<PlaneGeometry, ShaderMaterial>
  /** The core covers the whole screen (the landscape can be switched off behind it) */
  covering = false
  private center = new Vector3()

  constructor(private scene: Scene) {
    this.mesh = new Mesh(
      new PlaneGeometry(2, 2),
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        premultipliedAlpha: true,
        uniforms: {
          uCenter: { value: new Vector2(0.5, 0.5) },
          uAspect: { value: 1 },
          uRadius: { value: 0 },
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uCore: { value: new Color('#000000') },
          uHalo: { value: new Color('#f4efff') },
        },
      })
    )
    this.mesh.name = 'portal'
    this.mesh.frustumCulled = false
    // After the landscape and sky, before the particles (1000)
    this.mesh.renderOrder = 900
    this.mesh.visible = false
    scene.add(this.mesh)
  }

  /**
   * outro: 0 → 1 (or below 0 when there is none); logo: the ring's centre in the world.
   * Timeline: the portal opens from 0.12, covers the screen by 0.66, holds a moment, then
   * fades away from 0.76 to reveal the page.
   */
  update(outro: number, logo: Vector3, camera: PerspectiveCamera, aspect: number, elapsed: number) {
    const open = smooth(0.12, 0.66, outro)
    const fade = 1 - smooth(0.76, 0.94, outro)
    const u = this.mesh.material.uniforms
    this.mesh.visible = outro > 0.12 && fade > 0.001
    this.covering = outro >= 0.66
    if (!this.mesh.visible) return
    // Always exactly in the middle of the ring (which itself glides to the screen's centre)
    this.center.copy(logo).project(camera)
    ;(u.uCenter!.value as Vector2).set(this.center.x * 0.5 + 0.5, this.center.y * 0.5 + 0.5)
    u.uAspect!.value = aspect
    // Grows slowly at first, then rushes to cover the screen (corners included)
    u.uRadius!.value = 0.02 + open * open * 1.25
    u.uTime!.value = elapsed
    u.uOpacity!.value = smooth(0.12, 0.2, outro) * fade
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
