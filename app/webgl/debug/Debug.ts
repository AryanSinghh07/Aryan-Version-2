import type GUI from 'lil-gui'
import type Stats from 'stats.js'

// Tuning panel (lil-gui) and FPS meter (stats.js), only loaded when the URL ends in #debug.
// Both are separate chunks, so normal visitors never download them.
export class Debug {
  active = false
  gui: GUI | null = null
  private stats: Stats | null = null

  private loading = false

  async init() {
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
