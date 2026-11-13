import { gsap } from 'gsap'
import type { MaybeRefOrGetter } from 'vue'

// The "liquid" inside primary buttons: a few soft radial blobs drifting along slow paths,
// drawn on a small 2D canvas clipped to the pill. One shared loop draws every button that
// is on screen; off-screen buttons and hidden tabs cost nothing. With reduced motion each
// canvas is drawn once, still.

interface Blob {
  color: number
  /** Path speeds and phases (radians per second / radians) */
  sx: number
  sy: number
  px: number
  py: number
  radius: number
}

interface Liquid {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  blobs: Blob[]
  visible: boolean
  /** Eased 0..1 hover amount */
  hover: number
  hoverTarget: number
  time: number
}

/** Violet, periwinkle and lilac, plus a little lime as the signature spark. RGB triplets. */
const PALETTES = {
  light: ['123,63,242', '120,140,255', '201,184,255', '212,255,58'],
  dark: ['155,107,255', '125,140,255', '201,184,255', '212,255,58'],
} as const
/** Blob strength at the centre (edges fade to about a tenth of it) */
const ALPHA = { light: 0.42, dark: 0.34 } as const

const active = new Set<Liquid>()
let running = false
let observer: IntersectionObserver | null = null
const byCanvas = new WeakMap<Element, Liquid>()

/** The theme around this button (a section can set its own, like the style guide panels) */
function themeOf(el: Element) {
  const scope = el.closest<HTMLElement>('[data-theme]') ?? document.documentElement
  return scope.dataset.theme === 'dark' ? 'dark' : 'light'
}

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

function makeBlobs(seed: number): Blob[] {
  const rand = seeded(seed)
  return [0, 1, 2, 3].map((color) => ({
    color,
    sx: 0.25 + rand() * 0.35,
    sy: 0.2 + rand() * 0.3,
    px: rand() * Math.PI * 2,
    py: rand() * Math.PI * 2,
    radius: color === 3 ? 0.35 : 0.55 + rand() * 0.25,
  }))
}

function draw(l: Liquid) {
  const { canvas, ctx } = l
  const w = canvas.width
  const h = canvas.height
  if (!w || !h) return
  const t = themeOf(canvas)
  const colors = PALETTES[t]
  const strength = ALPHA[t] * (1 + l.hover * 0.35)
  ctx.clearRect(0, 0, w, h)
  // Normal blending: additive light would wash the pill out to white and drown the label
  ctx.globalCompositeOperation = 'source-over'
  for (const b of l.blobs) {
    // Two layered sines per axis: a slow wander that never repeats exactly
    const x =
      0.5 + 0.42 * Math.sin(l.time * b.sx + b.px) + 0.12 * Math.sin(l.time * b.sx * 2.3 + b.py)
    const y =
      0.5 + 0.35 * Math.cos(l.time * b.sy + b.py) + 0.1 * Math.sin(l.time * b.sy * 1.7 + b.px)
    const r = b.radius * Math.max(w, h) * (1 + l.hover * 0.15)
    const a = b.color === 3 ? strength * 0.45 : strength
    const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r)
    g.addColorStop(0, `rgba(${colors[b.color]},${a})`)
    g.addColorStop(1, `rgba(${colors[b.color]},${a * 0.08})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
}

function tick(_time: number, deltaMs: number) {
  const dt = Math.min(deltaMs / 1000, 0.1)
  for (const l of active) {
    if (!l.visible) continue
    l.hover += (l.hoverTarget - l.hover) * Math.min(1, dt * 6)
    l.time += dt * (1 + l.hover * 0.8)
    draw(l)
  }
}

function syncLoop() {
  const needed = [...active].some((l) => l.visible)
  if (needed && !running) {
    gsap.ticker.add(tick)
    running = true
  } else if (!needed && running) {
    gsap.ticker.remove(tick)
    running = false
  }
}

function resize(l: Liquid) {
  const rect = l.canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  // A soft gradient needs few pixels: half resolution is indistinguishable and cheaper
  l.canvas.width = Math.max(1, Math.round(rect.width * dpr * 0.5))
  l.canvas.height = Math.max(1, Math.round(rect.height * dpr * 0.5))
  draw(l)
}

/**
 * Animates a liquid canvas. `hovered` raises the strength and speed while the pointer is
 * over the button.
 */
export function useLiquidCanvas(
  target: MaybeRefOrGetter<HTMLCanvasElement | null | undefined>,
  hovered: MaybeRefOrGetter<boolean>
) {
  let liquid: Liquid | null = null
  let resizeObserver: ResizeObserver | null = null
  const still = () => prefersReducedMotion()

  onMounted(() => {
    const canvas = toValue(target)
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    liquid = {
      canvas,
      ctx,
      blobs: makeBlobs(Math.floor(Math.random() * 1e6) + 1),
      visible: false,
      hover: 0,
      hoverTarget: 0,
      time: Math.random() * 100,
    }
    byCanvas.set(canvas, liquid)
    resizeObserver = new ResizeObserver(() => liquid && resize(liquid))
    resizeObserver.observe(canvas)

    if (still()) return // drawn once on resize, never animated

    active.add(liquid)
    observer ??= new IntersectionObserver((entries) => {
      for (const e of entries) {
        const l = byCanvas.get(e.target)
        if (l) l.visible = e.isIntersecting
      }
      syncLoop()
    })
    observer.observe(canvas)
  })

  watch(
    () => toValue(hovered),
    (on) => {
      if (liquid) liquid.hoverTarget = on ? 1 : 0
    }
  )

  // Theme switch: redraw still canvases in the new colours
  const store = useAppStore()
  watch(
    () => store.theme,
    () => {
      if (liquid && still()) requestAnimationFrame(() => liquid && draw(liquid))
    }
  )

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    if (!liquid) return
    observer?.unobserve(liquid.canvas)
    active.delete(liquid)
    syncLoop()
  })
}
