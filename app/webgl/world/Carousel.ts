import {
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import type { PerspectiveCamera, Scene } from 'three'
import type { CarouselState } from '~/stores/app'
import type { QualityTier } from '../config/quality'
import fragmentShader from '../shaders/carousel/fragment.glsl'
import vertexShader from '../shaders/carousel/vertex.glsl'

/** Panel size in world units (16:20) */
const WIDTH = 2.4
const HEIGHT = 3
/** The ring: panels sit on a circle around the camera position, this far away */
const RADIUS = 9
/** Angle between neighbouring panels, radians */
const STEP = 0.3
/** Panels beyond this angle are faded out */
const MAX_ANGLE = 1.15
/** Panels hover a little above the middle; the floor (and reflection) is just below them */
const CENTER_Y = 0.25
const FLOOR_GAP = 0.08

interface Panel {
  slug: string
  group: Group
  front: Mesh<PlaneGeometry, ShaderMaterial>
  reflection: Mesh<PlaneGeometry, ShaderMaterial>
  texture: CanvasTexture
  hover: number
  wasHovered: boolean
  rippleStart: number
  exit: number
}

/**
 * The Work page carousel: one panel per project on an arc around the camera. The centred
 * panel is bright and clear; side panels dim, break into a mosaic and fade towards the ends
 * of the arc. Each panel has a glowing rim in its domain colour and a soft floor reflection.
 * The HTML page stays the real interface (titles, pagination, filters, links); this only
 * draws, and reports which panel is under the pointer.
 */
export class Carousel {
  group = new Group()
  /** Panel under the pointer, -1 for none */
  hovered = -1

  private panels: Panel[] = []
  private key = ''
  private geometry = new PlaneGeometry(WIDTH, HEIGHT, 24, 1)
  private raycaster = new Raycaster()
  private hit = new Vector2()
  private visibility = 0
  private detail = 1
  /** Items of the last sync, for redrawing textures once fonts arrive */
  private lastItems: CarouselState['items'] = []
  /** Cover images by URL, loaded once and kept across filter changes */
  private covers = new Map<string, HTMLImageElement>()

  constructor(private scene: Scene) {
    this.group.visible = false
    scene.add(this.group)
    // Panel text uses the brand fonts: redraw once they have loaded
    void document.fonts.ready.then(() => this.panels.forEach((p, i) => this.draw(p, i)))
  }

  setQuality(tier: QualityTier) {
    this.detail = tier === 'low' ? 0 : 1
  }

  update(
    state: CarouselState | null,
    active: boolean,
    camera: PerspectiveCamera,
    pointerNdc: Vector2 | null,
    elapsed: number,
    delta: number,
    reduced: boolean
  ) {
    // Fade the whole ring in on the Work page and out elsewhere
    const target = active && state ? 1 : 0
    this.visibility += (target - this.visibility) * Math.min(1, reduced ? 1 : delta * 4)
    this.group.visible = this.visibility > 0.01
    if (!state || !this.group.visible) {
      this.hovered = -1
      return
    }
    this.sync(state)

    // Which panel is under the pointer (front copies only)
    this.hovered = -1
    let hitUv: Vector2 | null = null
    if (pointerNdc && !state.exiting && active) {
      this.hit.copy(pointerNdc)
      this.raycaster.setFromCamera(this.hit, camera)
      const hits = this.raycaster.intersectObjects(this.panels.map((p) => p.front))
      const first = hits.find(
        (h) =>
          (h.object as Mesh<PlaneGeometry, ShaderMaterial>).material.uniforms.uFade!.value > 0.3
      )
      if (first) {
        this.hovered = this.panels.findIndex((p) => p.front === first.object)
        hitUv = first.uv ?? null
      }
    }

    const ease = Math.min(1, reduced ? 1 : delta * 6)
    this.panels.forEach((panel, i) => {
      const k = i - state.index
      const angle = k * STEP
      const activeAmount = Math.max(0, 1 - Math.abs(k))
      const edgeFade = 1 - smoothstep(MAX_ANGLE - 0.35, MAX_ANGLE, Math.abs(angle))

      // Opening a project: the others clear away, the chosen one moves forward
      const chosen = Math.round(state.index) === i
      panel.exit += ((state.exiting ? 1 : 0) - panel.exit) * Math.min(1, reduced ? 1 : delta * 5)
      const leave = chosen ? 0 : panel.exit

      const r = RADIUS + leave * 3
      panel.group.position.set(
        Math.sin(angle) * r,
        CENTER_Y,
        RADIUS - Math.cos(angle) * r + (chosen ? panel.exit * 1.6 : 0)
      )
      panel.group.rotation.y = -angle

      const hovered = this.hovered === i
      panel.hover += ((hovered ? 1 : 0) - panel.hover) * ease
      if (hovered && !panel.wasHovered) panel.rippleStart = elapsed
      panel.wasHovered = hovered

      for (const mesh of [panel.front, panel.reflection]) {
        const u = mesh.material.uniforms
        u.uActive!.value = activeAmount
        u.uHover!.value = reduced ? 0 : panel.hover
        u.uTime!.value = reduced ? 0 : elapsed
        u.uFade!.value = edgeFade * this.visibility * (1 - leave)
        u.uRippleTime!.value = elapsed - panel.rippleStart
        u.uDetail!.value = this.detail
        if (hovered && hitUv) (u.uPointer!.value as Vector2).copy(hitUv)
      }
    })
  }

  /** Rebuilds the panels when the list of projects changes (page load, filters) */
  private sync(state: CarouselState) {
    const key = state.items.map((i) => i.slug).join(',')
    if (key === this.key) return
    this.key = key
    this.clear()
    state.items.forEach((item, i) => {
      const texture = new CanvasTexture(document.createElement('canvas'))
      texture.colorSpace = SRGBColorSpace
      texture.minFilter = LinearFilter
      const color = new Color(item.color)
      const front = this.makeMesh(texture, color, false)
      const reflection = this.makeMesh(texture, color, true)
      // Mirrored below the floor line
      reflection.scale.y = -1
      reflection.position.y = -HEIGHT - FLOOR_GAP * 2
      const group = new Group()
      group.add(front, reflection)
      this.group.add(group)
      const panel: Panel = {
        slug: item.slug,
        group,
        front,
        reflection,
        texture,
        hover: 0,
        wasHovered: false,
        rippleStart: 0,
        exit: 0,
      }
      this.panels.push(panel)
      this.draw(panel, i, state)
    })
  }

  private makeMesh(texture: CanvasTexture, color: Color, reflection: boolean) {
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uMap: { value: texture },
        uDomain: { value: new Vector3(color.r, color.g, color.b) },
        uSize: { value: new Vector2(WIDTH, HEIGHT) },
        uActive: { value: 0 },
        uHover: { value: 0 },
        uTime: { value: 0 },
        uFade: { value: 0 },
        uReflection: { value: reflection ? 1 : 0 },
        uRippleTime: { value: 0 },
        uPointer: { value: new Vector2(0.5, 0.5) },
        uDetail: { value: 1 },
        uCurve: { value: 0.18 },
      },
    })
    const mesh = new Mesh(this.geometry, material)
    mesh.renderOrder = reflection ? 1 : 2
    return mesh
  }

  /** The cover image once it has loaded (starts loading it, and redraws the panels when ready) */
  private cover(url?: string) {
    if (!url) return null
    let img = this.covers.get(url)
    if (!img) {
      img = new Image()
      img.decoding = 'async'
      img.src = url
      this.covers.set(url, img)
      img
        .decode()
        .then(() => this.panels.forEach((p, i) => this.draw(p, i)))
        .catch(() => {})
    }
    return img.complete && img.naturalWidth ? img : null
  }

  /** Draws a project's card (cover, number, title, domain, year) into its panel texture */
  private draw(panel: Panel, index: number, state?: CarouselState) {
    const item = state?.items[index] ?? this.lastItems[index]
    if (!item) return
    if (state) this.lastItems = state.items
    const canvas = panel.texture.image as HTMLCanvasElement
    const w = 640
    const h = 800
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    const styles = getComputedStyle(document.documentElement)
    const display = styles.getPropertyValue('--font-display').trim() || 'serif'
    const mono = styles.getPropertyValue('--font-mono').trim() || 'monospace'

    // Deep plum card with a soft glow in the domain colour
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#2a1650')
    bg.addColorStop(1, '#120a1f')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    const glow = ctx.createRadialGradient(w * 0.7, h * 0.32, 0, w * 0.7, h * 0.32, w * 0.8)
    glow.addColorStop(0, hexToRgba(item.color, 0.45))
    glow.addColorStop(1, hexToRgba(item.color, 0))
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    // Fine blueprint grid
    ctx.strokeStyle = 'rgba(251, 250, 255, 0.06)'
    ctx.lineWidth = 1
    for (let x = 0; x <= w; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, h)
      ctx.stroke()
    }
    for (let y = 0; y <= h; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(w, y + 0.5)
      ctx.stroke()
    }

    // The cover: the top of the card, cropped to fill, with rounded corners, fading into the
    // card at its foot
    const img = this.cover(item.cover)
    const pad = 24
    const coverH = Math.round(h * 0.6)
    if (img) {
      const bw = w - pad * 2
      const bh = coverH - pad
      const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight)
      const sw = bw / scale
      const sh = bh / scale
      ctx.save()
      roundRect(ctx, pad, pad, bw, bh, 22)
      ctx.clip()
      ctx.drawImage(
        img,
        (img.naturalWidth - sw) / 2,
        (img.naturalHeight - sh) / 2,
        sw,
        sh,
        pad,
        pad,
        bw,
        bh
      )
      const fade = ctx.createLinearGradient(0, pad + bh * 0.45, 0, pad + bh)
      fade.addColorStop(0, 'rgba(18, 10, 31, 0)')
      fade.addColorStop(1, 'rgba(18, 10, 31, 0.92)')
      ctx.fillStyle = fade
      ctx.fillRect(pad, pad, bw, bh)
      ctx.restore()
      ctx.strokeStyle = hexToRgba(item.color, 0.55)
      ctx.lineWidth = 2
      roundRect(ctx, pad, pad, bw, bh, 22)
      ctx.stroke()
    }

    ctx.textBaseline = 'top'
    if (img) {
      // Number over the foot of the cover
      ctx.fillStyle = '#c9b8ff'
      ctx.font = `400 150px ${display}`
      ctx.shadowColor = 'rgba(18, 10, 31, 0.8)'
      ctx.shadowBlur = 24
      ctx.fillText(item.number, 44, coverH - 150)
      ctx.shadowBlur = 0
    } else {
      ctx.fillStyle = '#c9b8ff'
      ctx.font = `400 220px ${display}`
      ctx.fillText(item.number, 44, 40)
    }

    ctx.fillStyle = hexToRgba(item.color, 1)
    ctx.font = `500 22px ${mono}`
    ctx.fillText(item.domain.toUpperCase(), 48, h - 220)

    ctx.fillStyle = '#fbfaff'
    ctx.font = `400 58px ${display}`
    wrap(ctx, item.title, 48, h - 180, w - 96, 60, 2)

    ctx.font = `500 20px ${mono}`
    const year = String(item.year)
    const yw = ctx.measureText(year).width
    if (img) {
      // On the cover the year sits on a small dark chip
      ctx.fillStyle = 'rgba(18, 10, 31, 0.72)'
      roundRect(ctx, w - 48 - yw - 16, 44, yw + 32, 38, 19)
      ctx.fill()
      ctx.fillStyle = '#fbfaff'
      ctx.fillText(year, w - 48 - yw, 54)
    } else {
      ctx.fillStyle = 'rgba(251, 250, 255, 0.6)'
      ctx.fillText(year, w - 48 - yw, 56)
    }

    panel.texture.needsUpdate = true
  }

  private clear() {
    for (const p of this.panels) {
      this.group.remove(p.group)
      p.front.material.dispose()
      p.reflection.material.dispose()
      p.texture.dispose()
    }
    this.panels = []
  }

  dispose() {
    this.clear()
    this.geometry.dispose()
    this.scene.remove(this.group)
  }
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** Writes text over at most `lines` lines, breaking between words */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  lines: number
) {
  const words = text.split(' ')
  let line = ''
  let row = 0
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(row === lines - 1 ? `${line}…` : line, x, y + row * lineHeight)
      row++
      line = word
      if (row >= lines) return
    } else {
      line = next
    }
  }
  if (line && row < lines) ctx.fillText(line, x, y + row * lineHeight)
}

/** A rounded rectangle path */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}
