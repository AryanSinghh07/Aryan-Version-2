import { EventEmitter } from './EventEmitter'

// Viewport size and pixel ratio. The pixel ratio is capped at 2 and by the quality tier.
export class Sizes extends EventEmitter<{ resize: Sizes }> {
  width = 0
  height = 0
  pixelRatio = 1
  private maxPixelRatio = 2

  constructor() {
    super()
    this.measure()
    window.addEventListener('resize', this.onResize)
  }

  /** Lower the cap for weaker quality tiers */
  setMaxPixelRatio(max: number) {
    this.maxPixelRatio = Math.min(max, 2)
    this.onResize()
  }

  private measure() {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio)
  }

  private onResize = () => {
    this.measure()
    this.emit('resize', this)
  }

  dispose() {
    window.removeEventListener('resize', this.onResize)
    this.clearListeners()
  }
}
