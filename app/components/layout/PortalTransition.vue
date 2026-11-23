<script setup lang="ts">
import { gsap } from 'gsap'

// The portal page change: opening the About page from anywhere in the site plays the ring
// portal (the hero's particle ring, utils/portalReveal.ts). It opens once, from the "keep
// scrolling" ring when that is on screen (otherwise from the middle), the About page's colour
// inside it, until it passes the edges of the screen; the page changes underneath; then, once
// About has arrived, loaded and settled, the colour simply fades away onto it.
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
  const state: PortalRevealState = { ...origin(), radius: 0, fade: 0 }
  // The new page's colour inside the ring, the old page outside it
  const reveal = createPortalReveal(el, state, { inside: aboutColor(), outside: 'clear' })
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
  await openRing(state, { duration: 1.9, alive: () => !disposed })
  return running
}

/** The About page's colour: the home black at night, the page colour by day */
function aboutColor() {
  return store.theme === 'dark' ? '#121212' : pageColor()
}

const nuxtApp = useNuxtApp()

/**
 * Resolves once the new page has mounted (or after `max` ms). Until then it hasn't said whether
 * it is still loading (About flags its room as it mounts), so the checks below would pass too early
 * and the portal would fade onto the room's loading screen.
 */
function whenMounted(max = 5000) {
  return new Promise<void>((resolve) => {
    // (both run later, once timer and off exist)
    const done = () => {
      clearTimeout(timer)
      off()
      resolve()
    }
    const timer = setTimeout(done, max)
    const off = nuxtApp.hooks.hookOnce('page:finish', () => void nextTick(done))
  })
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

/** Resolves when the new page has loaded what it needs (or after `max` ms) */
function whenLoaded(max = 8000) {
  if (!store.pageLoading) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      stop()
      resolve()
    }, max)
    const stop = watch(
      () => store.pageLoading,
      (loading) => {
        if (loading) return
        clearTimeout(timer)
        stop()
        resolve()
      }
    )
  })
}

function finish() {
  if (canvas.value) gsap.set(canvas.value, { clearProps: 'opacity' })
  covering?.stop()
  covering = null
  active.value = false
  busy = false
  store.revealing = false
}

const removeBefore = router.beforeEach(async (to, from) => {
  if (busy || !import.meta.client) return true
  const target = normalizePath(to.path)
  if (!PORTAL_PAGES.includes(target) || normalizePath(from.path) === target) return true
  // Not on the first load, not before the visitor has entered, not with reduced motion
  if (!from.matched.length || !store.entered || prefersReducedMotion()) return true
  busy = true
  store.revealing = true
  covering = await cover()
  if (!covering) finish()
  return true
})

const removeAfter = router.afterEach(async () => {
  const running = covering
  if (!running) return
  // The new page has to arrive (its page change runs under the cover), finish loading its
  // own 3D scene if it has one, and settle first
  await whenMounted()
  await whenArrived()
  await whenLoaded()
  await whenSettled()
  // The colour fades away onto the new page
  if (canvas.value) await gsap.to(canvas.value, { opacity: 0, duration: 0.9, ease: 'power2.out' })
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
