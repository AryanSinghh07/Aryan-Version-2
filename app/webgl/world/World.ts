import type { Scene } from 'three'
import type { FrameState } from '../Experience'
import { Environment } from './Environment'
import { TestCube } from './TestCube'

// Everything that lives in the 3D scene. Phase 6 swaps the test cube for the particles.
export class World {
  private environment: Environment
  private cube: TestCube

  constructor(scene: Scene) {
    this.environment = new Environment(scene)
    this.cube = new TestCube(scene)
  }

  update(state: FrameState, delta: number) {
    this.cube.update(state, delta)
  }

  dispose() {
    this.cube.dispose()
  }
}
