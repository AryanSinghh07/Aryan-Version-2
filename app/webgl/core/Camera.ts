import { PerspectiveCamera } from 'three'
import type { Sizes } from './Sizes'

// Perspective camera. Scene-by-scene camera paths arrive in Phase 6 (config/scenes.ts).
export class Camera {
  instance: PerspectiveCamera

  constructor(private sizes: Sizes) {
    this.instance = new PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
    this.instance.position.set(0, 0, 8)
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height
    this.instance.updateProjectionMatrix()
  }
}
