<script setup lang="ts">
import { gsap } from 'gsap'

// The portal page change: opening the About page from anywhere in the site plays the hero's
// portal (dark core, smoky rim, white halo, glitch bands and a colour split). It grows from
// the "keep scrolling" ring when that is on screen (otherwise from the middle) until it
// covers the screen; the page changes underneath; then, once the new page has arrived and the
// frames run smoothly, a hole tears open in the middle and reveals it.
//
// Skipped with reduced motion, before the visitor has entered the site, on the first load of a
// page, and without WebGL: the normal page change plays instead.
const router = useRouter()
const store = useAppStore()

/** Pages that open through the portal */
const PORTAL_PAGES = ['/about']

const canvas = ref<HTMLCanvasElement | null>(null)
const active = ref(false)

interface Running {
  state: PortalRevealState
  stop: () => void
}
/** The portal covering the screen while the page changes underneath */
let covering: Running | null = null
let busy = false
let disposed = false

function origin() {
  const ring = document.querySelector('.next-page__ring-wrap')?.getBoundingClientRect()
  if (ring && ring.top >= 0 && ring.bottom <= window.innerHeight) {
    return { x: ring.left + ring.width / 2, y: ring.top + ring.height / 2 }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

/** Grows the portal until it covers the screen; null when it can't run (no WebGL) */
async function cover(): Promise<Running | null> {
  active.value = true
  await nextTick()
  const el = canvas.value
  if (!el) return null
  const state: PortalRevealState = { ...origin(), radius: 0, hole: 0, glitch: 0 }
  const reveal = createPortalReveal(el, state)
  if (!reveal) return null
  const draw = () => reveal.draw()
  gsap.ticker.add(draw)
  const running = {
    state,
    stop: () => {
      gsap.ticker.remove(draw)
      reveal.dispose()
    },
  }
  await new Promise<void>((resolve) => {
    gsap
      .timeline({ onComplete: resolve })
      .to(state, { radius: 1.6, duration: 1.1, ease: 'power2.in' }, 0)
      .to(state, { glitch: 1, duration: 0.1, ease: 'none' }, 0)
      .to(state, { glitch: 0.12, duration: 0.5, ease: 'power2.out' }, 0.1)
      .to(state, { glitch: 0.85, duration: 0.06, ease: 'none' }, 0.72)
      .to(state, { glitch: 0, duration: 0.3, ease: 'power2.out' }, 0.78)
  })
  return running
}

/** Resolves when the page change has finished (or after `max` ms) */
function whenArrived(max = 3000) {
  if (!store.navigating) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      stop()
      resolve()
    }, max)
    const stop = watch(
      () => store.navigating,
      (navigating) => {
        if (navigating) return
        clearTimeout(timer)
        stop()
        resolve()
      }
    )
  })
}

function finish() {
  covering?.stop()
  covering = null
  active.value = false
  busy = false
}

const removeBefore = router.beforeEach(async (to, from) => {
  if (busy || !import.meta.client) return true
  const target = normalizePath(to.path)
  if (!PORTAL_PAGES.includes(target) || normalizePath(from.path) === target) return true
  // Not on the first load, not before the visitor has entered, not with reduced motion
  if (!from.matched.length || !store.entered || prefersReducedMotion()) return true
  busy = true
  covering = await cover()
  if (!covering) finish()
  return true
})

const removeAfter = router.afterEach(async () => {
  const running = covering
  if (!running) return
  // The new page has to arrive (its page change runs under the cover) and settle first
  await whenArrived()
  await whenSettled()
  // The hole opens in the middle of the screen
  running.state.x = window.innerWidth / 2
  running.state.y = window.innerHeight / 2
  await openPortalHole(running.state, () => !disposed)
  finish()
})

onBeforeUnmount(() => {
  disposed = true
  removeBefore()
  removeAfter()
  finish()
})
</script>

<template>
  <canvas v-show="active" ref="canvas" class="portal-transition" aria-hidden="true" />
</template>

<style scoped lang="scss">
// Over everything while the page changes; it takes the clicks meanwhile
.portal-transition {
  position: fixed;
  inset: 0;
  z-index: 260;
  width: 100%;
  height: 100%;
}
</style>
