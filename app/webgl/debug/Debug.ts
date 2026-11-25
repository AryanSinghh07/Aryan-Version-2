import type GUI from 'lil-gui'
import type Stats from 'stats.js'

// Tuning panel (lil-gui) and FPS meter (stats.js), only loaded when the URL ends in #debug, and
// only while developing: the published site leaves them out entirely (import.meta.dev is false
// there, so the bundler drops this code and both libraries).
export class Debug {
  active = false
  gui: GUI | null = null
  private stats: Stats | null = null

  private loading = false

  async init() {
    if (!import.meta.dev) return
    if (window.location.hash !== '#debug' || this.active || this.loading) return
    this.loading = true
    const [{ default: GUIClass }, { default: StatsClass }] = await Promise.all([
      import('lil-gui'),
      import('stats.js'),
    ])
    this.gui = new GUIClass({ title: 'WebGL debug' })
    this.stats = new StatsClass()
    this.stats.showPanel(0)
    this.stats.dom.style.cssText = 'position:fixed;left:0;bottom:0;z-index:1000'
    document.body.appendChild(this.stats.dom)
    this.active = true
  }

  begin() {
    this.stats?.begin()
  }

  end() {
    this.stats?.end()
  }

  dispose() {
    this.gui?.destroy()
    this.stats?.dom.remove()
  }
}
