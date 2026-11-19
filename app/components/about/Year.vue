<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

// The year zoom, after "How it began" on the About page. A screen holds while the visitor
// scrolls through a tall stretch: "Since 2023" waits small at the foot on the left; then the
// year grows into giant digits that glide until the 0 sits in the middle of the screen; then
// the camera dives into the 0, and its hole opens as a window onto a purple section with a
// pill and a statement in the display serif, which rises in letter by letter. Then the page
// carries on ("How I work"). All tied to the scroll, so scrolling back plays it in reverse.
//
// With reduced motion (or before JavaScript) the purple section is simply shown.
const props = defineProps<{
  year: { label: string; value: string; pill: string; statement: string }
}>()

/** How far the camera dives into the 0, as a scale on the giant year */
const ZOOM = 14
/** The 0's counter (its hole) as a capsule, in em of the giant year: half-width, half-height */
const COUNTER = { x: 0.15, y: 0.25 }

const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const big = ref<HTMLElement | null>(null)
const small = ref<HTMLElement | null>(null)
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

onMounted(async () => {
  if (prefersReducedMotion()) return
  enabled.value = true
  await nextTick()
  await document.fonts.ready
  const el = root.value
  if (!el || !stage.value || !big.value || !small.value || !win.value) return

  ctx = gsap.context(() => {
    const year = big.value!
    const label = small.value!
    const windowEl = win.value!
    const smallYear = label.querySelector<HTMLElement>('.year__small-value')!
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

    // Measurements (at scale 1): the giant year's font size, and the centre of its 0
    let F = 0
    let cx0 = 0
    let cy0 = 0
    let s0 = 0.05
    let lx = 0
    let ly = 0
    const measure = () => {
      year.style.transform = 'none'
      const er = year.getBoundingClientRect()
      const zr = year.children[zero.value]!.getBoundingClientRect()
      F = parseFloat(getComputedStyle(year).fontSize)
      cx0 = zr.left - er.left + zr.width / 2
      cy0 = zr.top - er.top + zr.height / 2
      // Where the 0 sits in the small label, and how much smaller the label's year is
      const sr = stage.value!.getBoundingClientRect()
      const small0 = smallYear.children[zero.value]!.getBoundingClientRect()
      lx = small0.left - sr.left + small0.width / 2
      ly = small0.top - sr.top + small0.height / 2
      s0 = parseFloat(getComputedStyle(smallYear).fontSize) / F
    }

    const render = (p: number) => {
      const W = stage.value!.clientWidth
      const H = stage.value!.clientHeight
      // The label hands over to the giant year
      const handover = smooth(0.05, 0.1, p)
      gsap.set(label, { autoAlpha: 1 - handover })
      gsap.set(year, { autoAlpha: handover })
      // The year grows until the 0 is in the middle, then the camera dives into the 0
      const grow = smooth(0.06, 0.45, p)
      const dive = smooth(0.45, 0.86, p)
      const s = s0 * Math.pow(1 / s0, grow) * Math.pow(ZOOM, dive)
      const px = lerp(lx, W / 2, grow)
      const py = lerp(ly, H / 2, grow)
      year.style.transform = `translate(${px - cx0 * s}px, ${py - cy0 * s}px) scale(${s})`
      // The window: a capsule inside the 0's hole, opening as the camera dives
      const hw = F * s * COUNTER.x
      const hh = F * s * COUNTER.y
      const open = smooth(0.44, 0.5, p)
      windowEl.style.opacity = String(open)
      windowEl.style.clipPath = `inset(${py - hh}px ${W - (px + hw)}px ${H - (py + hh)}px ${px - hw}px round ${hw}px)`
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
        <!-- Decorative: the label and the giant year that grows out of it -->
        <p ref="small" class="year__small t-label container" aria-hidden="true">
          {{ year.label }}
          <span class="year__small-value">
            <span v-for="(d, i) in digits" :key="i">{{ d }}</span>
          </span>
        </p>
        <p ref="big" class="year__big" aria-hidden="true">
          <span v-for="(d, i) in digits" :key="i">{{ d }}</span>
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

// The label at the foot on the left, where the story left it
.year__small {
  position: absolute;
  inset: auto 0 clamp(2rem, 5vh, 3.5rem);
  margin: 0;
  color: var(--foreground-muted);
}

.year__small-value {
  display: inline-block;
  margin-left: 0.6em;

  span {
    display: inline-block;
    line-height: 0.74;
  }
}

// The giant year: transformed from its top left corner by the scroll (see render)
.year__big {
  position: absolute;
  top: 0;
  left: 0;
  margin: 0;
  font-family: var(--font-body);
  font-size: 60vw;
  font-weight: 500;
  line-height: 0.74;
  letter-spacing: -0.04em;
  white-space: nowrap;
  color: var(--foreground);
  transform-origin: 0 0;
  will-change: transform;
  pointer-events: none;
  opacity: 0;

  span {
    display: inline-block;
  }
}
</style>
