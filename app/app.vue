<script setup lang="ts">
import { gsap } from 'gsap'
import type { TransitionProps } from 'vue'

useHead({
  titleTemplate: (title) =>
    title ? `${title} — Aryan Singh` : 'Aryan Singh — Full Stack Developer and AI/ML Engineer',
})

const store = useAppStore()

// While the preloader or entry gate covers the screen, the page behind can't be focused.
// Only applied in the browser, so the server HTML is never inert.
const mounted = ref(false)
onMounted(() => (mounted.value = true))
const covered = computed(() => mounted.value && !store.entered)

// Page transitions: the old page slides up and fades out, then the new one rises in. The 3D
// canvas lives outside the page and keeps running; the camera moves to the new page's view
// meanwhile (webgl/config/scenes.ts). Instant with reduced motion.
const finish = () => (store.navigating = false)

/**
 * Runs `done` once: when the animation completes, or after a time limit if animation frames
 * stall (a background tab, a very busy device), so a page change can never get stuck.
 */
function settle(el: Element, done: () => void, limit: number) {
  let called = false
  const timer = setTimeout(() => {
    gsap.killTweensOf(el)
    run()
  }, limit)
  function run() {
    if (called) return
    called = true
    clearTimeout(timer)
    done()
  }
  return run
}

const pageTransition: TransitionProps = {
  name: 'page',
  mode: 'out-in',
  css: false,
  onBeforeLeave: () => (store.navigating = true),
  onLeave(el, done) {
    if (prefersReducedMotion()) return done()
    const complete = settle(el, done, 1200)
    gsap.to(el, { autoAlpha: 0, y: -32, duration: 0.45, ease: 'power2.in', onComplete: complete })
  },
  onEnter(el, done) {
    const complete = settle(
      el,
      () => {
        gsap.set(el, { clearProps: 'opacity,visibility,transform' })
        finish()
        done()
      },
      1600
    )
    if (prefersReducedMotion()) return complete()
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 32 },
      { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', onComplete: complete }
    )
  },
  onEnterCancelled: finish,
  onLeaveCancelled: finish,
}
</script>

<template>
  <a href="#main" class="skip-link t-label" :inert="covered || undefined">Skip to content</a>
  <LayoutHeader :inert="covered || undefined" />
  <main id="main" tabindex="-1" :inert="covered || undefined">
    <NuxtPage :transition="pageTransition" />
  </main>
  <LayoutFooter :inert="covered || undefined" :class="{ 'is-navigating': store.navigating }" />
  <LayoutEntryGate />
  <LayoutPreloader />
  <Cursor />
</template>

<style lang="scss">
.skip-link {
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 200;
  padding: 0.75em 1.25em;
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  transform: translateY(-200%);

  &:focus-visible {
    transform: none;
  }
}

#main:focus {
  outline: none;
}
</style>
