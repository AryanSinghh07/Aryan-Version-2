import { AmbientLight, DirectionalLight } from 'three'
import type { Scene } from 'three'

// Basic lighting for lit test objects. Phase 7 adds fog, background and environment maps.
export class Environment {
  private ambient = new AmbientLight(0xffffff, 0.6)
  private key = new DirectionalLight(0xffffff, 2.2)

  constructor(scene: Scene) {
    this.key.position.set(3, 4, 5)
    scene.add(this.ambient, this.key)
  }
}
