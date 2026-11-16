import { AmbientLight, DirectionalLight, HemisphereLight } from 'three'
import type { Scene } from 'three'
import { lookColor, lookNumber } from '../config/landscape'
import type { Palette } from '../core/Palette'

// Lighting for the landscape and the glass (from the Digital Atmosphere scene): an ambient
// fill, a sky/ground hemisphere, and a key light from far behind and above. Moonlight at
// night, warm sun by day, blended with the theme.
export class Environment {
  private ambient = new AmbientLight()
  private hemisphere = new HemisphereLight()
  private key = new DirectionalLight()

  constructor(scene: Scene) {
    this.key.position.set(60, 80, -120)
    scene.add(this.ambient, this.hemisphere, this.key)
  }

  update(palette: Palette) {
    const d = palette.darkness
    lookColor('ambient', d, this.ambient.color)
    this.ambient.intensity = lookNumber('ambientI', d)
    lookColor('hemiSky', d, this.hemisphere.color)
    lookColor('hemiGround', d, this.hemisphere.groundColor)
    this.hemisphere.intensity = lookNumber('hemiI', d)
    lookColor('sun', d, this.key.color)
    this.key.intensity = lookNumber('sunI', d)
  }
}
