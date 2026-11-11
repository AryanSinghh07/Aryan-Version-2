import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'

// Pointer position projected onto the z = 0 plane of the 3D scene (where the particles live).
// The canvas ignores pointer events, so this listens on the window instead.
export class Pointer {
  /** Normalised device coordinates, -1..1 */
  ndc = new Vector2(0, 0)
  /** Pointer position in the 3D scene, on the z = 0 plane */
  world = new Vector3(999, 999, 0)
  /** True while the pointer is over the page and has moved recently */
  active = false

  private raycaster = new Raycaster()
  private plane = new Plane(new Vector3(0, 0, 1), 0)
  private lastMove = 0

  constructor() {
    window.addEventListener('pointermove', this.onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', this.onLeave)
  }

  update(camera: PerspectiveCamera, now: number) {
    // Rest after a few seconds without movement (and on touch, after the finger lifts)
    if (this.active && now - this.lastMove > 3000) this.active = false
    this.raycaster.setFromCamera(this.ndc, camera)
    this.raycaster.ray.intersectPlane(this.plane, this.world)
  }

  private onMove = (e: PointerEvent) => {
    this.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
    this.active = true
    this.lastMove = performance.now()
  }

  private onLeave = () => {
    this.active = false
  }

  dispose() {
    window.removeEventListener('pointermove', this.onMove)
    document.documentElement.removeEventListener('pointerleave', this.onLeave)
  }
}
