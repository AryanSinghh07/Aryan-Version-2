import { BoxGeometry, Color, MathUtils, Mesh, MeshStandardMaterial } from 'three'
import type { Scene } from 'three'
import type { FrameState } from '../Experience'
import { SCENE_COLORS } from '../config/theme'

// Phase 5 test object. Proves the WebGL bridge works: it takes the theme colour, turns with
// the hero scene, and moves aside on inner pages. Replaced by the particles in Phase 6.
export class TestCube {
  mesh: Mesh<BoxGeometry, MeshStandardMaterial>
  private targetColor = new Color()

  constructor(private scene: Scene) {
    const geometry = new BoxGeometry(1.4, 1.4, 1.4)
    const material = new MeshStandardMaterial({ roughness: 0.35, metalness: 0.2 })
    this.mesh = new Mesh(geometry, material)
    this.mesh.name = 'testCube'
    scene.add(this.mesh)
  }

  update(state: FrameState, delta: number) {
    const { mesh } = this
    const ease = 1 - Math.exp(-delta * 4) // frame-rate independent smoothing

    // Theme colour
    this.targetColor.set(SCENE_COLORS[state.theme].particleA)
    mesh.material.color.lerp(this.targetColor, ease)

    // Spin gently, and tilt one step per hero scene
    if (!state.reducedMotion) mesh.rotation.y += delta * 0.4
    mesh.rotation.x = MathUtils.lerp(mesh.rotation.x, state.scene * (Math.PI / 4), ease)

    // Centre on the home page, off to the right elsewhere
    const targetX = state.route === '/' ? 0 : 2.4
    mesh.position.x = MathUtils.lerp(mesh.position.x, targetX, ease)
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
