import type { Texture } from 'three'
import {
  CanvasTexture,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector3,
} from 'three'
import type { Palette } from '../core/Palette'
import fragmentShader from '../shaders/media/fragment.glsl'
import vertexShader from '../shaders/media/vertex.glsl'

/** Marks the page while WebGL draws the media, so the HTML copies can step aside */
const ACTIVE_CLASS = 'webgl-media'

interface MediaItem {
  el: HTMLElement
  mesh: Mesh<PlaneGeometry, ShaderMaterial>
  label: CanvasTexture | null
  labelSize: string
  image: Texture | null
  hover: number
  /** When the pointer last entered the plane (seconds), so each hover starts a new ripple */
  rippleStart: number
  wasHovered: boolean
}

/** Height of the top and bottom screen bands where cards glitch while scrolling */
const EDGE_ZONE = 0.16

/**
 * Project images and placeholders, redrawn in WebGL so they can bend and glitch with the
 * scroll. Any element with `data-webgl-media` gets a plane that matches its exact position and
 * size every frame. Inside it, an <img> becomes the texture; otherwise children marked
 * `data-webgl-text="primary" | "muted"` are drawn as the placeholder's text.
 *
 * The HTML elements stay in place (made transparent with CSS), so layout, links and screen
 * readers are unchanged, and if WebGL is unavailable nothing is hidden at all.
 */
export class MediaPlanes {
  scene = new Scene()
  camera = new OrthographicCamera(0, 1, 0, -1, -1000, 1000)
  items: MediaItem[] = []

  private geometry = new PlaneGeometry(1, 1, 32, 1)
  private loader = new TextureLoader()
  private observer: MutationObserver
  private rescanTimer: ReturnType<typeof setTimeout> | undefined
  private dummyMap: Texture
  private scrollY = 0
  private velocity = 0
  private lastPointer = new Vector2(-1, -1)
  private pointerSpeed = 0

  constructor() {
    const pixel = document.createElement('canvas')
    pixel.width = pixel.height = 1
    this.dummyMap = new CanvasTexture(pixel)

    // Pages and filters add and remove media: rescan shortly after the DOM changes
    this.observer = new MutationObserver(() => this.scheduleRescan())
    this.observer.observe(document.body, { childList: true, subtree: true })
    document.documentElement.classList.add(ACTIVE_CLASS)
    // Text in placeholders uses the brand fonts: redraw once they have loaded
    void document.fonts.ready.then(() => this.items.forEach((i) => (i.labelSize = '')))
    this.rescan()
  }

  resize(width: number, height: number) {
    this.camera.right = width
    this.camera.bottom = -height
    this.camera.updateProjectionMatrix()
  }

  /** Scroll speed in pixels per second (smoothed), for bending and glitching */
  get scrollVelocity() {
    return this.velocity
  }

  /**
   * @param pointer pointer position in CSS pixels, or null when the pointer is not over the page
   */
  update(
    palette: Palette,
    elapsed: number,
    delta: number,
    pointer: Vector2 | null,
    reducedMotion: boolean
  ) {
    // Scroll velocity from the page position (works with Lenis and native scrolling)
    const y = window.scrollY
    const raw = delta > 0 ? (y - this.scrollY) / delta : 0
    this.scrollY = y
    this.velocity += (raw - this.velocity) * Math.min(delta * 8, 1)

    const bendPx = reducedMotion ? 0 : Math.max(-60, Math.min(60, -this.velocity * 0.012))
    // Only shows inside the edge bands, so it can start at gentler speeds
    const glitch = reducedMotion ? 0 : smoothstep(300, 2600, Math.abs(this.velocity))

    // Pointer speed (screen widths per second, eased) makes ripples stronger
    if (pointer && this.lastPointer.x >= 0 && delta > 0) {
      const speed = pointer.distanceTo(this.lastPointer) / delta / Math.max(window.innerWidth, 1)
      this.pointerSpeed += (Math.min(speed, 1) - this.pointerSpeed) * Math.min(delta * 6, 1)
    } else {
      this.pointerSpeed *= 0.9
    }
    if (pointer) this.lastPointer.copy(pointer)
    else this.lastPointer.set(-1, -1)
    const vw = window.innerWidth
    const vh = window.innerHeight
    const { colors } = palette

    for (const item of this.items) {
      const r = item.el.getBoundingClientRect()
      const onScreen =
        r.width > 0 && r.bottom > -100 && r.top < vh + 100 && r.right > 0 && r.left < vw
      item.mesh.visible = onScreen
      if (!onScreen) continue

      item.mesh.position.set(r.left + r.width / 2, -(r.top + r.height / 2), 0)
      item.mesh.scale.set(r.width, r.height, 1)

      const u = item.mesh.material.uniforms
      ;(u.uSize!.value as Vector2).set(r.width, r.height)
      u.uRadius!.value = parseFloat(getComputedStyle(item.el).borderTopLeftRadius) || 0
      u.uBend!.value = bendPx / Math.max(r.height, 1)
      u.uGlitch!.value = glitch
      u.uTime!.value = elapsed

      const hovered =
        !!pointer &&
        !reducedMotion &&
        pointer.x >= r.left &&
        pointer.x <= r.right &&
        pointer.y >= r.top &&
        pointer.y <= r.bottom
      item.hover += ((hovered ? 1 : 0) - item.hover) * Math.min(delta * 6, 1)
      u.uHover!.value = item.hover
      if (hovered && !item.wasHovered) item.rippleStart = elapsed
      item.wasHovered = hovered
      u.uRippleTime!.value = elapsed - item.rippleStart
      if (pointer && hovered) {
        ;(u.uPointer!.value as Vector2).set(
          (pointer.x - r.left) / Math.max(r.width, 1),
          1 - (pointer.y - r.top) / Math.max(r.height, 1)
        )
      }
      u.uPointerSpeed!.value = this.pointerSpeed
      u.uViewportHeight!.value = vh

      setVec3(u.uSurface!.value as Vector3, colors.surface)
      setVec3(u.uLavender!.value as Vector3, colors.lavender)
      setVec3(u.uPrimary!.value as Vector3, colors.particleA)
      setVec3(u.uMuted!.value as Vector3, colors.muted)
      setVec3(u.uAccent!.value as Vector3, colors.spark)

      // Redraw the placeholder text when the box size changes (or fonts arrive)
      if (!item.image) {
        const size = `${Math.round(r.width)}x${Math.round(r.height)}`
        if (size !== item.labelSize) {
          item.labelSize = size
          this.drawLabel(item, r)
        }
      }
    }
  }

  dispose() {
    this.observer.disconnect()
    clearTimeout(this.rescanTimer)
    this.items.forEach((i) => this.remove(i))
    this.items = []
    this.geometry.dispose()
    this.dummyMap.dispose()
    document.documentElement.classList.remove(ACTIVE_CLASS)
  }

  // ------------------------------------------------------------------ internals

  private scheduleRescan() {
    clearTimeout(this.rescanTimer)
    this.rescanTimer = setTimeout(() => this.rescan(), 60)
  }

  private rescan() {
    const elements = new Set(document.querySelectorAll<HTMLElement>('[data-webgl-media]'))
    // Drop planes whose elements left the page
    this.items = this.items.filter((item) => {
      if (elements.has(item.el) && item.el.isConnected) {
        elements.delete(item.el)
        return true
      }
      this.remove(item)
      return false
    })
    for (const el of elements) this.items.push(this.add(el))
  }

  private add(el: HTMLElement): MediaItem {
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uMap: { value: this.dummyMap },
        uHasImage: { value: 0 },
        uImageSize: { value: new Vector2(1, 1) },
        uLabel: { value: this.dummyMap },
        uSize: { value: new Vector2(1, 1) },
        uRadius: { value: 0 },
        uBend: { value: 0 },
        uHover: { value: 0 },
        uGlitch: { value: 0 },
        uTime: { value: 0 },
        uSurface: { value: new Vector3() },
        uLavender: { value: new Vector3() },
        uPrimary: { value: new Vector3() },
        uMuted: { value: new Vector3() },
        uAccent: { value: new Vector3() },
        uPointer: { value: new Vector2(0.5, 0.5) },
        uRippleTime: { value: 0 },
        uPointerSpeed: { value: 0 },
        uViewportHeight: { value: window.innerHeight },
        uEdgeZone: { value: EDGE_ZONE },
      },
    })
    const mesh = new Mesh(this.geometry, material)
    mesh.frustumCulled = false
    mesh.visible = false
    this.scene.add(mesh)
    const item: MediaItem = {
      el,
      mesh,
      label: null,
      labelSize: '',
      image: null,
      hover: 0,
      rippleStart: 0,
      wasHovered: false,
    }

    const img = el instanceof HTMLImageElement ? el : el.querySelector('img')
    if (img) {
      const src = img.currentSrc || img.src
      this.loader.load(src, (texture) => {
        if (!item.el.isConnected) return texture.dispose()
        texture.colorSpace = SRGBColorSpace
        texture.minFilter = LinearFilter
        item.image = texture
        const image = texture.image as HTMLImageElement
        material.uniforms.uMap!.value = texture
        ;(material.uniforms.uImageSize!.value as Vector2).set(
          image.naturalWidth || 1,
          image.naturalHeight || 1
        )
        material.uniforms.uHasImage!.value = 1
      })
    }
    return item
  }

  /** Draws the placeholder's text where it sits in the HTML, in the same fonts */
  private drawLabel(item: MediaItem, box: DOMRect) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(box.width * ratio))
    canvas.height = Math.max(1, Math.round(box.height * ratio))
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(ratio, ratio)
    ctx.textBaseline = 'alphabetic'

    item.el.querySelectorAll<HTMLElement>('[data-webgl-text]').forEach((t) => {
      const style = getComputedStyle(t)
      const r = t.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(t)
      const textRect = range.getBoundingClientRect()
      let text = t.textContent ?? ''
      if (style.textTransform === 'uppercase') text = text.toUpperCase()
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
      // Red channel: primary-coloured text; green channel: muted text
      ctx.fillStyle = t.dataset.webglText === 'muted' ? '#0f0' : '#f00'
      const metrics = ctx.measureText(text)
      const left = (textRect.width ? textRect.left : r.left) - box.left
      const top = (textRect.height ? textRect.top : r.top) - box.top
      // Place the baseline so the glyphs' box matches the HTML text box
      const fontBox = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
      const lineHeight = textRect.height || fontBox
      const baseline = top + (lineHeight - fontBox) / 2 + metrics.fontBoundingBoxAscent
      ctx.fillText(text, left, baseline)
    })

    item.label?.dispose()
    const texture = new CanvasTexture(canvas)
    texture.minFilter = LinearFilter
    item.label = texture
    item.mesh.material.uniforms.uLabel!.value = texture
  }

  private remove(item: MediaItem) {
    this.scene.remove(item.mesh)
    item.mesh.material.dispose()
    item.label?.dispose()
    item.image?.dispose()
  }
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

function setVec3(target: Vector3, color: { r: number; g: number; b: number }) {
  target.set(color.r, color.g, color.b)
}
