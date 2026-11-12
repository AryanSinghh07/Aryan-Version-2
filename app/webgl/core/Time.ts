import { gsap } from 'gsap'
import { EventEmitter } from './EventEmitter'

export interface TickEvent {
  /** Seconds since the Experience started */
  elapsed: number
  /** Seconds since the last frame, clamped so a background tab never causes a huge jump */
  delta: number
  /** Seconds since the last frame, unclamped (for measuring performance) */
  rawDelta: number
}

// Frame clock driven by the GSAP ticker, the same ticker that drives Lenis and ScrollTrigger,
// so scroll position and rendering always advance on the same frame. While the tab is hidden
// no frames are emitted, so nothing renders (browsers also slow the ticker down, but some
// still run it in the background).
export class Time extends EventEmitter<{ tick: TickEvent }> {
  elapsed = 0
  delta = 0

  constructor() {
    super()
    gsap.ticker.add(this.onTick)
  }

  private onTick = (time: number, deltaMs: number) => {
    if (document.hidden) return
    this.elapsed = time
    this.delta = Math.min(deltaMs / 1000, 0.1)
    this.emit('tick', { elapsed: this.elapsed, delta: this.delta, rawDelta: deltaMs / 1000 })
  }

  dispose() {
    gsap.ticker.remove(this.onTick)
    this.clearListeners()
  }
}
