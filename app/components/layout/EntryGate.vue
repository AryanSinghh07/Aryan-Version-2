<script setup lang="ts">
import { gsap } from 'gsap'

// Asks "with sound or without" when the visitor lands on the home page.
// The click is the user gesture browsers need before any audio can play.
// Visitors who land on another page skip the gate, with sound as they last left it (off at first).
//
// Leaving the gate: the buttons fade, "Aryan" glitches off to the left and "Singh" to the
// right, the AS mark glides to the centre, and the ring portal (the hero's particle ring)
// opens from it once, the site inside it, until it passes the edges of the screen.
// With reduced motion, or without WebGL, the gate simply fades.
const store = useAppStore()
const route = useRoute()
const { $sound } = useNuxtApp()

const root = ref<HTMLElement | null>(null)
const portal = ref<HTMLCanvasElement | null>(null)
const show = ref(false)
const leaving = ref(false)
const landedOnHome = route.path === '/'
let timeline: gsap.core.Timeline | null = null
let stopPortal: (() => void) | null = null

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
      // Rises in as the loading cover lifts away above it
      gsap.from(root.value.querySelectorAll('.gate__inner > *'), {
        y: 24,
        autoAlpha: 0,
        duration: 0.9,
        stagger: 0.08,
        delay: 0.45,
        ease: 'power3.out',
      })
    }
  },
  { immediate: true }
)

function enter(withSound: boolean) {
  if (leaving.value) return
  leaving.value = true
  // Inside the click, so the browser lets audio start. With sound, the ambient loop starts
  // fading in and the entry chime plays while the gate leaves.
  store.setSound(withSound)
  if (withSound) {
    $sound.enable()
    $sound.play('enter')
  }

  const done = () => {
    show.value = false
    store.entered = true
    // The focused button is gone: start keyboard navigation from the top of the page again,
    // so the next Tab reaches "Skip to content" and then the header
    const body = document.body
    body.tabIndex = -1
    body.focus({ preventScroll: true })
    body.removeAttribute('tabindex')
  }
  if (prefersReducedMotion() || !root.value) return done()
  if (!openPortal(done)) {
    gsap.to(root.value, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut', onComplete: done })
  }
}

/** The portal exit; false when it can't run (no WebGL), so the caller fades instead */
function openPortal(done: () => void) {
  const el = root.value
  const canvas = portal.value
  const mark = el?.querySelector<HTMLElement>('.gate__mark')
  if (!el || !canvas || !mark) return false
  const state: PortalRevealState = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    radius: 0,
    fade: 0,
  }
  // The site shows inside the ring, the gate's own colour outside it
  const reveal = createPortalReveal(canvas, state, { inside: 'clear', outside: pageColor() })
  if (!reveal) return false

  const draw = () => reveal.draw()
  gsap.ticker.add(draw)
  stopPortal = () => {
    gsap.ticker.remove(draw)
    reveal.dispose()
    stopPortal = null
  }

  const box = mark.getBoundingClientRect()
  const toCentre = {
    x: state.x - (box.left + box.width / 2),
    y: state.y - (box.top + box.height / 2),
  }
  const q = (selector: string) => [...el.querySelectorAll<HTMLElement>(selector)]
  const glitching = (els: HTMLElement[], on: boolean) =>
    els.forEach((e) => e.classList.toggle('is-glitching', on))
  const half = () => window.innerWidth * 0.65

  // The ring opens from the mark, once: the site inside it, the gate's colour outside, until
  // it passes the edges of the screen. Its clock pauses rather than skips if the page stalls.
  const open = async () => {
    if (!root.value) return
    gsap.to(mark, { scale: 0.2, autoAlpha: 0, duration: 0.45, ease: 'power2.in' })
    // From here the canvas paints the gate's colour around the ring
    el.classList.add('is-through')
    if (!(await openRing(state, { duration: 2.4, alive: () => !!root.value }))) return
    stopPortal?.()
    done()
  }

  timeline = gsap
    .timeline()
    // The label and buttons step aside
    .to(q('.gate__meta, .gate__actions'), {
      autoAlpha: 0,
      y: 14,
      duration: 0.35,
      stagger: 0.05,
      ease: 'power2.in',
    })
    // The name splits: Aryan off to the left, Singh off to the right, glitching as they go
    .call(() => glitching(q('.gate__first, .gate__last'), true), [], 0.05)
    .to(
      q('.gate__first'),
      { x: () => -half(), skewX: 14, autoAlpha: 0, duration: 1, ease: 'expo.in' },
      0.05
    )
    .to(
      q('.gate__last'),
      { x: () => half(), skewX: -14, autoAlpha: 0, duration: 1, ease: 'expo.in' },
      0.05
    )
    // The AS mark glides to the centre
    .call(() => glitching([mark], true), [], 0.3)
    .to(mark, { ...toCentre, scale: 1.5, duration: 0.9, ease: 'power3.inOut' }, 0.3)
    // The site starts behind the gate. Starting it is heavy (the hero, the 3D world): the ring
    // waits until the frames run smoothly again, so it then opens without a jump
    .call(
      () => {
        store.entered = true
        void whenSettled().then(open)
      },
      [],
      1.2
    )
  return true
}

onBeforeUnmount(() => {
  timeline?.kill()
  stopPortal?.()
})

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
      <h2 id="gate-title" class="t-h2 gate__name">
        <span class="gate__first">Aryan</span> <em class="gate__last">Singh</em>
      </h2>
      <p class="gate__meta t-label t-muted">Portfolio © 2026 · Best with sound</p>
      <div class="gate__actions">
        <UiGlassButton variant="primary" @click="enter(true)"> Enter with sound </UiGlassButton>
        <UiGlassButton variant="outline" @click="enter(false)">Enter without sound</UiGlassButton>
      </div>
    </div>
    <canvas ref="portal" class="gate__portal" aria-hidden="true" />
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

  // The ring is opening: the canvas paints the gate's colour around it, so the gate's own
  // background can go (the site shows inside the ring)
  &.is-through {
    background: transparent;
  }
}

.gate__portal {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
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

// The two halves of the name fly apart
.gate__first,
.gate__last {
  display: inline-block;
}

.gate__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

// Glitch: slices of the element jump sideways while its colours split into magenta and cyan
.is-glitching {
  animation: gate-glitch 0.42s steps(1) infinite;
}

.gate__mark.is-glitching {
  animation-name: gate-glitch-mark;
}

@keyframes gate-glitch {
  0% {
    clip-path: inset(0 0 0 0);
    translate: 0 0;
    text-shadow:
      3px 0 #ff2bd6,
      -3px 0 #22e4ff;
  }
  15% {
    clip-path: inset(0 0 38% 0);
    translate: -8px 0;
  }
  30% {
    clip-path: inset(30% 0 0 0);
    translate: 10px 0;
    text-shadow:
      -4px 0 #ff2bd6,
      4px 0 #22e4ff;
  }
  45% {
    clip-path: inset(0 0 0 0);
    translate: 0 0;
  }
  60% {
    clip-path: inset(18% 0 18% 0);
    translate: 6px 0;
  }
  75% {
    clip-path: inset(0 0 0 0);
    translate: -3px 0;
    text-shadow:
      2px 0 #ff2bd6,
      -2px 0 #22e4ff;
  }
}

@keyframes gate-glitch-mark {
  0% {
    translate: 0 0;
    rotate: 0deg;
    box-shadow:
      4px 0 0 #ff2bd6,
      -4px 0 0 #22e4ff;
  }
  20% {
    translate: -6px 1px;
    rotate: 4deg;
  }
  40% {
    translate: 5px 0;
    rotate: 0deg;
    box-shadow:
      -5px 0 0 #ff2bd6,
      5px 0 0 #22e4ff;
  }
  60% {
    clip-path: inset(0 0 22% 0);
    translate: 0 0;
  }
  70% {
    clip-path: inset(0 0 0 0);
    translate: -3px 0;
    rotate: -3deg;
  }
  85% {
    translate: 2px 0;
    rotate: 0deg;
    box-shadow:
      2px 0 0 #ff2bd6,
      -2px 0 0 #22e4ff;
  }
}
</style>
