<script setup lang="ts">
import { gsap } from 'gsap'

// Asks "with sound or without" when the visitor lands on the home page.
// The click is the user gesture browsers need before any audio can play.
// Visitors who land on another page skip the gate, with sound as they last left it (off at first).
const store = useAppStore()
const route = useRoute()
const { $sound } = useNuxtApp()

const root = ref<HTMLElement | null>(null)
const show = ref(false)
const landedOnHome = route.path === '/'

watch(
  () => store.loaded,
  async (loaded) => {
    if (!loaded || store.entered) return
    if (!landedOnHome) {
      store.entered = true
      return
    }
    show.value = true
    // The visitor is about to choose: have the audio library ready for "Enter with sound"
    $sound.preload()
    await nextTick()
    // Focus first: the fade-in below hides the buttons for a frame, and hidden buttons
    // can't take focus
    root.value?.querySelector<HTMLButtonElement>('button')?.focus()
    if (!prefersReducedMotion() && root.value) {
      gsap.from(root.value.querySelectorAll('.gate__inner > *'), {
        y: 24,
        autoAlpha: 0,
        duration: 0.8,
        stagger: 0.08,
      })
    }
  },
  { immediate: true }
)

function enter(withSound: boolean) {
  // Inside the click, so the browser lets audio start. With sound, the ambient loop starts
  // fading in and the entry chime plays while the gate fades out.
  store.setSound(withSound)
  if (withSound) {
    $sound.enable()
    $sound.play('enter')
  }

  const done = () => {
    show.value = false
    store.entered = true
    // The focused button is about to disappear: start keyboard navigation from the top of
    // the page again, so the next Tab reaches "Skip to content" and then the header
    const body = document.body
    body.tabIndex = -1
    body.focus({ preventScroll: true })
    body.removeAttribute('tabindex')
  }
  if (prefersReducedMotion() || !root.value) return done()
  gsap.to(root.value, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut', onComplete: done })
}

// Two buttons only: keep Tab on them
function trapFocus(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !root.value) return
  const buttons = [...root.value.querySelectorAll<HTMLButtonElement>('button')]
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (!first || !last) return
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <div
    v-if="show"
    ref="root"
    class="gate"
    role="dialog"
    aria-modal="true"
    aria-labelledby="gate-title"
    @keydown="trapFocus"
  >
    <div class="gate__inner container">
      <span class="gate__mark" aria-hidden="true">AS</span>
      <h2 id="gate-title" class="t-h2">Aryan <em>Singh</em></h2>
      <p class="t-label t-muted">Portfolio © 2026 · Best with sound</p>
      <div class="gate__actions">
        <UiGlassButton variant="primary" @click="enter(true)"> Enter with sound </UiGlassButton>
        <UiGlassButton variant="outline" @click="enter(false)">Enter without sound</UiGlassButton>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.gate {
  position: fixed;
  inset: 0;
  z-index: 250;
  display: grid;
  place-items: center;
  background: var(--background);
}

.gate__inner {
  display: grid;
  justify-items: center;
  gap: 1.5rem;
  text-align: center;
}

.gate__mark {
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

.gate__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1rem;
}
</style>
