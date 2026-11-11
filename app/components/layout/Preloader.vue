<script setup lang="ts">
import { gsap } from 'gsap'

// Covers the first paint, counts 0–100% while tracked assets load, then slides away.
// Assets register through store.trackLoad (fonts and page load now; models, textures and
// audio from Phase 5). Rendered on the server so it covers the page from the first frame;
// CSS hides it when JavaScript is off.
const store = useAppStore()

const root = ref<HTMLElement | null>(null)
const percent = ref(0)
const visible = ref(true)

const MIN_TIME = 1.2 // seconds the counter takes at minimum, so it never flashes
const MAX_WAIT = 10_000 // give up waiting on slow assets after this long

let reduced = false
let startedAt = 0
let finished = false
let timeout: ReturnType<typeof setTimeout> | undefined
const shown = { value: 0 }

// Ease the visible number towards the real progress every frame
function tick() {
  const elapsed = (performance.now() - startedAt) / 1000
  const timeCap = reduced ? 1 : Math.min(elapsed / MIN_TIME, 1)
  const target = Math.min(store.loadProgress, timeCap)
  shown.value += (target - shown.value) * (reduced ? 1 : 0.12)
  percent.value = Math.round(shown.value * 100)
  if (store.loadProgress >= 1 && timeCap >= 1 && shown.value > 0.995) finish()
}

function finish() {
  if (finished) return
  finished = true
  clearTimeout(timeout)
  gsap.ticker.remove(tick)
  percent.value = 100

  const done = () => {
    visible.value = false
    store.loaded = true
  }
  if (reduced || !root.value) return done()
  gsap
    .timeline({ onComplete: done })
    .to(root.value.querySelectorAll('.preloader__inner > *'), {
      yPercent: -40,
      autoAlpha: 0,
      duration: 0.5,
      stagger: 0.05,
      ease: 'power3.in',
    })
    .to(root.value, { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, '-=0.1')
}

onMounted(() => {
  reduced = prefersReducedMotion()
  startedAt = performance.now()

  store.trackLoad(document.fonts.ready)
  store.trackLoad(
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>((resolve) =>
          window.addEventListener('load', () => resolve(), { once: true })
        )
  )

  timeout = setTimeout(finish, MAX_WAIT)
  gsap.ticker.add(tick)
})

onBeforeUnmount(() => {
  clearTimeout(timeout)
  gsap.ticker.remove(tick)
})
</script>

<template>
  <div
    v-if="visible"
    ref="root"
    class="preloader"
    role="progressbar"
    aria-label="Loading"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="percent"
  >
    <div class="preloader__inner">
      <span class="preloader__mark" aria-hidden="true">AS</span>
      <p class="preloader__tagline t-label t-muted">Building things that actually matter.</p>
      <p class="preloader__count" aria-hidden="true">
        {{ percent }}<span class="preloader__percent">%</span>
      </p>
    </div>
    <div class="preloader__bar" :style="{ transform: `scaleX(${percent / 100})` }" />
  </div>
</template>

<style scoped lang="scss">
.preloader {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: grid;
  place-items: center;
  background: var(--background);
  color: var(--foreground);
}

// Without JavaScript nothing would ever remove it
:global(html:not(.js) .preloader) {
  display: none;
}

.preloader__inner {
  display: grid;
  justify-items: center;
  gap: 1.25rem;
  text-align: center;
}

.preloader__mark {
  display: grid;
  place-items: center;
  width: 3.5rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--foreground);
  color: var(--background);
  font-family: var(--font-display);
  font-size: 1.5rem;
}

.preloader__count {
  font-family: var(--font-display);
  font-size: clamp(4rem, 14vw, 9rem);
  line-height: 0.9;
  font-variant-numeric: tabular-nums;
}

.preloader__percent {
  font-size: 0.4em;
  color: var(--primary);
  vertical-align: top;
}

.preloader__bar {
  position: absolute;
  inset: auto 0 0;
  height: 3px;
  background: var(--accent);
  transform-origin: left;
}
</style>
