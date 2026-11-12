import { NoToneMapping, SRGBColorSpace, WebGLRenderer } from 'three'
import type { Camera } from './Camera'
import type { Sizes } from './Sizes'
import type { Camera as ThreeCamera, Scene } from 'three'

// WebGL2 renderer with sRGB output. The 3D background (world/Background.ts) fills the canvas;
// the page's own theme colour only shows if WebGL is unavailable.
export class Renderer {
  instance: WebGLRenderer

  constructor(
    canvas: HTMLCanvasElement,
    private sizes: Sizes,
    private scene: Scene,
    private camera: Camera
  ) {
    this.instance = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.instance.outputColorSpace = SRGBColorSpace
    // No tone mapping: colours come straight from the brand palette, and the colour grade
    // (post-processing) shapes the final look the same way on every quality tier
    this.instance.toneMapping = NoToneMapping
    this.instance.setClearColor(0x000000, 0)
    this.resize()
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height, false)
    this.instance.setPixelRatio(this.sizes.pixelRatio)
  }

  /** Renders the main scene, then an optional overlay scene on top (no clear in between) */
  render(overlay?: { scene: Scene; camera: ThreeCamera }) {
    this.instance.render(this.scene, this.camera.instance)
    if (!overlay) return
    this.instance.autoClear = false
    this.instance.render(overlay.scene, overlay.camera)
    this.instance.autoClear = true
  }

  dispose() {
    this.instance.dispose()
  }
}
