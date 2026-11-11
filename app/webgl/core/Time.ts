import { gsap } from 'gsap'
import { EventEmitter } from './EventEmitter'

export interface TickEvent {
  /** Seconds since the Experience started */
  elapsed: number
  /** Seconds since the last frame, clamped so a background tab never causes a huge jump */
  delta: number
}

// Frame clock driven by the GSAP ticker, the same ticker that drives Lenis and ScrollTrigger,
// so scroll position and rendering always advance on the same frame.
export class Time extends EventEmitter<{ tick: TickEvent }> {
  elapsed = 0
  delta = 0

  constructor() {
    super()
    gsap.ticker.add(this.onTick)
  }

  private onTick = (time: number, deltaMs: number) => {
    this.elapsed = time
    this.delta = Math.min(deltaMs / 1000, 0.1)
    this.emit('tick', { elapsed: this.elapsed, delta: this.delta })
  }

  dispose() {
    gsap.ticker.remove(this.onTick)
    this.clearListeners()
  }
}
