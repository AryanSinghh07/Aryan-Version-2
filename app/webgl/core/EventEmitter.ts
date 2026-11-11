// Minimal typed event emitter for the WebGL classes.
type Listener<T> = (payload: T) => void

export class EventEmitter<Events extends Record<string, unknown>> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {}

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>) {
    ;(this.listeners[event] ??= new Set()).add(listener)
    return () => this.off(event, listener)
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>) {
    this.listeners[event]?.delete(listener)
  }

  protected emit<K extends keyof Events>(event: K, payload: Events[K]) {
    this.listeners[event]?.forEach((listener) => listener(payload))
  }

  protected clearListeners() {
    this.listeners = {}
  }
}
