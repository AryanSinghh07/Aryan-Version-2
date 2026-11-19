<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

// The year zoom, after "How it began" on the About page. A screen holds while the visitor
// scrolls through a tall stretch: "Since 2023" waits small at the foot on the left; then it
// grows into giant type that glides until the 0 sits in the middle of the screen ("Since"
// sliding off to the left); then the camera dives into the 0, and its hole is a window onto a
// purple section with a pill and a statement in the display serif, which rises in letter by
// letter. Then the page carries on ("How I work"). All tied to the scroll, so scrolling back
// plays it in reverse.
//
// The window sits behind the type, an oval reaching halfway into the 0's stroke, so the stroke
// itself trims it exactly to the hole (the 0's shape is measured from the font, see glyph()).
// With reduced motion (or before JavaScript) the purple section is simply shown.
const props = defineProps<{
  year: { label: string; value: string; pill: string; statement: string }
}>()

/** How far the camera dives into the 0, as a scale on the giant type */
const ZOOM = 14
/** The type's size at the start, at the foot on the left (px) */
const SMALL = 15

const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const big = ref<HTMLElement | null>(null)
const win = ref<HTMLElement | null>(null)
const enabled = ref(false)

const digits = computed(() => props.year.value.split(''))
/** Index of the digit the camera dives into: the first 0 (or the middle digit) */
const zero = computed(() => {
  const i = digits.value.indexOf('0')
  return i >= 0 ? i : Math.floor(digits.value.length / 2)
})

let ctx: gsap.Context | null = null
let split: SplitText | null = null

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * The shape of the digit, measured by drawing it in the same font and scanning its pixels:
 * the centre of its ink (from the start of the text and from the baseline), and the half sizes
 * of its hole and of its outside, across and down through the centre.
 */
function glyph(span: HTMLElement) {
  const cs = getComputedStyle(span)
  const size = parseFloat(cs.fontSize)
  const font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`
  const canvas = document.createElement('canvas')
  const g = canvas.getContext('2d', { willReadFrequently: true })
  if (!g) return null
  g.font = font
  const ch = span.textContent ?? '0'
  const m = g.measureText(ch)
  const pad = Math.ceil(size * 0.1)
  canvas.width = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight + pad * 2)
  canvas.height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + pad * 2)
  g.font = font
  g.fillStyle = '#fff'
  const start = pad + m.actualBoundingBoxLeft
  const baseline = pad + m.actualBoundingBoxAscent
  g.fillText(ch, start, baseline)
  const { data, width, height } = g.getImageData(0, 0, canvas.width, canvas.height)
  const ink = (x: number, y: number) => data[(y * width + x) * 4 + 3]! > 127
  const cx = Math.round(pad + (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 2)
  const cy = Math.round(baseline - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2)
  const row = [...Array(width).keys()].map((x) => ink(x, cy))
  const col = [...Array(height).keys()].map((y) => ink(cx, y))
  // Across a line through the centre: the outer edges, and the hole between the strokes
  const edges = (line: boolean[]) => {
    const first = line.indexOf(true)
    const last = line.lastIndexOf(true)
    const holeStart = line.indexOf(false, first)
    const holeEnd = line.lastIndexOf(false, last)
    return first < 0 || holeStart < 0 || holeStart > holeEnd
      ? null
      : { outer: (last - first) / 2, hole: (holeEnd - holeStart) / 2 }
  }
  const across = edges(row)
  const down = edges(col)
  if (!across || !down) return null
  return {
    x: cx - start,
    y: cy - baseline,
    hole: { x: across.hole, y: down.hole },
    outer: { x: across.outer, y: down.outer },
    ascent: m.fontBoundingBoxAscent,
    descent: m.fontBoundingBoxDescent,
  }
}

onMounted(async () => {
  if (prefersReducedMotion()) return
  enabled.value = true
  await nextTick()
  await document.fonts.ready
  const el = root.value
  if (!el || !stage.value || !big.value || !win.value) return

  ctx = gsap.context(() => {
    const type = big.value!
    const windowEl = win.value!
    const statement = windowEl.querySelector<HTMLElement>('.year__statement')!
    const pill = windowEl.querySelector<HTMLElement>('.year__pill')!

    // The statement rises in letter by letter once the window is open
    split = SplitText.create(statement, {
      type: 'lines,words,chars',
      mask: 'lines',
      linesClass: textClasses.line,
      wordsClass: textClasses.word,
      charsClass: textClasses.char,
      aria: 'auto',
    })
    hideText(statement)
    gsap.set(pill, { autoAlpha: 0, y: 14 })
    let shown: gsap.core.Timeline | null = null
    const showText = () => {
      if (shown) return
      shown = gsap
        .timeline()
        .to(pill, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0)
        .add(textIn(statement, 1, 0.9), 0.1)
    }
    const hideTextAgain = () => {
      if (!shown) return
      shown.kill()
      shown = null
      hideText(statement)
      gsap.set(pill, { autoAlpha: 0, y: 14 })
    }

    // Measurements at scale 1: the centre of the 0 in the giant type, the window's size, and
    // where the type starts (small, at the foot on the left)
    let cx0 = 0
    let cy0 = 0
    let ox = 0
    let oy = 0
    let s0 = 0.05
    let x0 = 0
    let y0 = 0
    const measure = () => {
      type.style.transform = 'none'
      const er = type.getBoundingClientRect()
      const span = type.querySelectorAll<HTMLElement>('[data-digit]')[zero.value]!
      const zr = span.getBoundingClientRect()
      const shape = glyph(span)
      if (shape) {
        // The span is a tight line box: where its baseline sits inside it
        const baseline = (zr.height - (shape.ascent + shape.descent)) / 2 + shape.ascent
        cx0 = zr.left - er.left + shape.x
        cy0 = zr.top - er.top + baseline + shape.y
        // The window: an oval halfway between the hole and the outside, hidden under the stroke
        ox = (shape.hole.x + shape.outer.x) / 2
        oy = (shape.hole.y + shape.outer.y) / 2
      } else {
        cx0 = zr.left - er.left + zr.width / 2
        cy0 = zr.top - er.top + zr.height / 2
        ox = zr.width * 0.36
        oy = zr.height * 0.42
      }
      const H = stage.value!.clientHeight
      const F = parseFloat(getComputedStyle(type).fontSize)
      s0 = SMALL / F
      // At the start: small, at the page's left edge, a little above the foot
      const anchor = stage.value!.querySelector<HTMLElement>('.year__anchor')!
      x0 =
        anchor.getBoundingClientRect().left -
        stage.value!.getBoundingClientRect().left +
        parseFloat(getComputedStyle(anchor).paddingLeft)
      y0 = H - Math.max(32, H * 0.05) - er.height * s0
    }

    const render = (p: number) => {
      const W = stage.value!.clientWidth
      const H = stage.value!.clientHeight
      // The type grows until the 0 is in the middle, then the camera dives into the 0
      const grow = smooth(0.04, 0.45, p)
      const dive = smooth(0.45, 0.86, p)
      const s = s0 * Math.pow(1 / s0, grow) * Math.pow(ZOOM, dive)
      // The 0's centre: from its place in the small type to the middle of the screen
      const px = lerp(x0 + cx0 * s0, W / 2, grow)
      const py = lerp(y0 + cy0 * s0, H / 2, grow)
      type.style.transform = `translate(${px - cx0 * s}px, ${py - cy0 * s}px) scale(${s})`
      // The window through the 0, opening as the camera dives
      windowEl.style.opacity = String(smooth(0.42, 0.5, p))
      windowEl.style.clipPath = `ellipse(${ox * s}px ${oy * s}px at ${px}px ${py}px)`
      if (p > 0.8) showText()
      else if (p < 0.7) hideTextAgain()
    }

    measure()
    ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => {
        measure()
        render(self.progress)
      },
    })
    render(0)
  }, el)
})

onBeforeUnmount(() => {
  ctx?.revert()
  split?.revert()
})
</script>

<template>
  <section
    ref="root"
    class="year"
    :class="{ 'is-motion': enabled }"
    :aria-label="`${year.label} ${year.value}`"
  >
    <div ref="stage" class="year__stage">
      <!-- The window through the 0: a purple section with the statement -->
      <div ref="win" class="year__window">
        <div class="year__aurora" aria-hidden="true" />
        <div class="year__content container">
          <span class="year__pill t-label">{{ year.pill }}</span>
          <p class="year__statement text-glitch">{{ year.statement }}</p>
        </div>
      </div>

      <template v-if="enabled">
        <!-- Measures the page's side padding -->
        <div class="year__anchor container" aria-hidden="true" />
        <!-- Decorative: "Since 2023", small at first, then giant -->
        <p ref="big" class="year__type" aria-hidden="true">
          <span class="year__type-label">{{ year.label }}</span>
          <span v-for="(d, i) in digits" :key="i" data-digit>{{ d }}</span>
        </p>
      </template>
    </div>
  </section>
</template>

<style scoped lang="scss">
// Without motion: just the purple section
.year__window {
  position: relative;
  overflow: hidden;
  min-height: 80svh;
  display: grid;
  place-items: center;
  color: #fff;
}

// With motion: a tall stretch, the screen held while the year grows and the window opens
.year.is-motion {
  height: 420vh;

  .year__stage {
    position: sticky;
    top: 0;
    height: 100svh;
    overflow: hidden;
    background: var(--page-bg, var(--background));
  }

  .year__window {
    position: absolute;
    inset: 0;
    min-height: 0;
    opacity: 0;
    will-change: clip-path;
  }
}

.year__anchor {
  position: absolute;
  inset: 0 0 auto;
  height: 0;
}

// A slow purple aurora with soft vertical light streaks
.year__aurora {
  position: absolute;
  inset: -10%;
  background:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.035) 0 2px, transparent 2px 9%),
    radial-gradient(55% 45% at 30% 75%, rgba(126, 64, 255, 0.85), transparent 70%),
    radial-gradient(45% 40% at 88% 85%, rgba(44, 28, 230, 0.85), transparent 70%),
    radial-gradient(60% 50% at 65% 15%, rgba(10, 4, 20, 0.9), transparent 75%),
    linear-gradient(180deg, #1c0636 0%, #2a0d5c 55%, #3a1890 100%);
  filter: blur(2px);
  animation: aurora 18s ease-in-out infinite alternate;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}

@keyframes aurora {
  from {
    transform: translate3d(-3%, 0, 0) scale(1);
  }
  to {
    transform: translate3d(3%, -2%, 0) scale(1.06);
  }
}

.year__content {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 2.25rem;
  text-align: center;
}

.year__pill {
  padding: 0.45em 0.95em;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 0.8rem;
  line-height: 1.2;
}

.year__statement {
  max-width: 13em;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 5.2vw, 6.5rem);
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: -0.01em;
  color: #fff;
}

// "Since 2023": transformed from its top left corner by the scroll (see render), from label
// size at the foot to giant
.year__type {
  position: absolute;
  top: 0;
  left: 0;
  margin: 0;
  font-family: var(--font-body);
  font-size: 60vw;
  font-weight: 500;
  line-height: 0.74;
  letter-spacing: -0.03em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--foreground);
  transform-origin: 0 0;
  will-change: transform;
  pointer-events: none;

  span {
    display: inline-block;
  }
}

.year__type-label {
  margin-right: 0.28em;
}
</style>
