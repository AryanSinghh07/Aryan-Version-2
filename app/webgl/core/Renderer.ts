import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer } from 'three'
import type { Camera } from './Camera'
import type { Sizes } from './Sizes'
import type { Scene } from 'three'

// WebGL2 renderer with sRGB output and filmic tone mapping. The canvas is transparent,
// so the page's theme background shows through until Phase 7 adds scene colours.
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
    this.instance.toneMapping = ACESFilmicToneMapping
    this.instance.toneMappingExposure = 1
    this.instance.setClearColor(0x000000, 0)
    this.resize()
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height, false)
    this.instance.setPixelRatio(this.sizes.pixelRatio)
  }

  render() {
    this.instance.render(this.scene, this.camera.instance)
  }

  dispose() {
    this.instance.dispose()
  }
}
