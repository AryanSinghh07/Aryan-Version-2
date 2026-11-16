import { AmbientLight, DirectionalLight, HemisphereLight } from 'three'
import type { Scene } from 'three'

// Lighting for the landscape and the glass (from the Digital Atmosphere scene): a lavender
// ambient, a violet sky/plum ground hemisphere, and a soft key light from far behind and above.
export class Environment {
  private ambient = new AmbientLight(0x8a6fc0, 0.45)
  private hemisphere = new HemisphereLight(0xa98ad4, 0x171827, 0.6)
  private key = new DirectionalLight(0xc9a0e8, 1.4)

  constructor(scene: Scene) {
    this.key.position.set(60, 80, -120)
    scene.add(this.ambient, this.hemisphere, this.key)
  }
}
