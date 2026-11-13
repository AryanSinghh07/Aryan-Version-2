<script setup lang="ts">
// The "keep scrolling" reveal at the very end of every page. The section is taller than the
// screen and its content stays pinned while the visitor scrolls through it: a spread
// sentence drifts apart, a ring fills, and the 3D camera already glides towards the next
// page's view. When the ring is full the next page opens, so arriving has no visible cut.
//
// Only the visitor's own scrolling (wheel, touch, keys) can open the page, never a restored
// scroll position (Back) or a script, and the ring has to stay full for a moment. It is also
// a plain link (keyboard, screen readers, no JavaScript, reduced motion: no pinning at all).
const route = useRoute()
const router = useRouter()
const store = useAppStore()
const lenis = useLenis()
const { data: projects } = await useProjects()

/** Page order: projects are the strongest content, so home leads to Work */
const PAGES = [
  { to: '/', label: 'Home', hint: 'home' },
  { to: '/work', label: 'Work', hint: 'selected work' },
  { to: '/about', label: 'About', hint: 'about me' },
  { to: '/contact', label: 'Contact', hint: 'say hello' },
]
const WORDS = ['Keep', 'scrolling', 'to', 'explore']
/** Recent input counts as "the visitor is scrolling", ms */
const INPUT_WINDOW = 1000
/** How long the ring must stay full before the page changes, ms */
const HOLD = 350
const RADIUS = 48
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const next = computed(() => {
  const path = normalizePath(route.path)
  if (path.startsWith('/work/')) {
    const list = projects.value ?? []
    const i = list.findIndex((p) => `/work/${p.slug}` === path)
    const project = i >= 0 ? list[(i + 1) % list.length] : undefined
    return project
      ? { to: `/work/${project.slug}`, label: project.title, hint: 'next project' }
      : null
  }
  const i = PAGES.findIndex((p) => p.to === path)
  return i >= 0 ? PAGES[(i + 1) % PAGES.length]! : null
})

const section = ref<HTMLElement | null>(null)
const progress = ref(0)
const auto = ref(false)
let lastInput = 0
let holdTimer: ReturnType<typeof setTimeout> | undefined
let fired = false

const offset = computed(() => CIRCUMFERENCE * (1 - progress.value))
/** Words drift from the centre to their columns over the first half of the reveal */
const spread = computed(() => Math.min(progress.value * 2, 1))

/** 0 when the pinned stage first fills the screen, 1 at the very end of the page */
function measure() {
  const el = section.value
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  const travel = Math.max(rect.height - window.innerHeight, 1)
  return Math.min(Math.max(-rect.top / travel, 0), 1)
}

function canGo() {
  return (
    !fired &&
    !!next.value &&
    store.entered &&
    !store.overlayOpen &&
    !store.heroLocked &&
    !store.navigating &&
    performance.now() - lastInput < INPUT_WINDOW
  )
}

function update() {
  progress.value = measure()
  // Let the 3D world lean towards the next page while the reveal fills
  store.nextPreview =
    next.value && progress.value > 0 ? { route: next.value.to, progress: progress.value } : null
  if (progress.value < 0.999) {
    clearTimeout(holdTimer)
    holdTimer = undefined
    return
  }
  if (holdTimer || !canGo()) return
  holdTimer = setTimeout(() => {
    holdTimer = undefined
    if (measure() < 0.999 || !canGo() || !next.value) return
    fired = true
    void router.push(next.value.to)
  }, HOLD)
}

const onInput = () => {
  lastInput = performance.now()
}

onMounted(() => {
  auto.value = !prefersReducedMotion()
  if (!auto.value) return
  window.addEventListener('wheel', onInput, { passive: true })
  window.addEventListener('touchmove', onInput, { passive: true })
  window.addEventListener('keydown', onInput)
  if (lenis) lenis.on('scroll', update)
  else window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
})

// A new page: empty ring, ready to fire again
watch(
  () => route.path,
  () => {
    fired = false
    clearTimeout(holdTimer)
    holdTimer = undefined
    progress.value = 0
    store.nextPreview = null
  }
)

onBeforeUnmount(() => {
  clearTimeout(holdTimer)
  store.nextPreview = null
  window.removeEventListener('wheel', onInput)
  window.removeEventListener('touchmove', onInput)
  window.removeEventListener('keydown', onInput)
  lenis?.off('scroll', update)
  window.removeEventListener('scroll', update)
  window.removeEventListener('resize', update)
})
</script>

<template>
  <section
    v-if="next"
    ref="section"
    class="next-page"
    :class="{ 'is-auto': auto }"
    aria-label="Next page"
  >
    <div class="next-page__stage">
      <p class="next-page__sentence t-label" aria-hidden="true">
        <span
          v-for="(word, i) in WORDS"
          :key="word"
          class="next-page__word"
          :class="`next-page__word--${i}`"
          :style="{ '--spread': spread }"
          >{{ i === 0 ? `(${word}` : i === WORDS.length - 1 ? `${word})` : word }}</span
        >
      </p>
      <p class="next-page__line t-label" aria-hidden="true">(Keep scrolling to explore)</p>

      <NuxtLink :to="next.to" class="next-page__link">
        <span class="next-page__ring-wrap">
          <svg class="next-page__ring" viewBox="0 0 112 112" aria-hidden="true">
            <circle class="next-page__track" cx="56" cy="56" :r="RADIUS" />
            <circle
              class="next-page__fill"
              cx="56"
              cy="56"
              :r="RADIUS"
              :stroke-dasharray="CIRCUMFERENCE"
              :stroke-dashoffset="offset"
            />
          </svg>
          <span class="next-page__arrow" aria-hidden="true">↓</span>
        </span>
        <span class="next-page__hint t-label">[ next: {{ next.hint }} ]</span>
        <span class="next-page__title">{{ next.label }}</span>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped lang="scss">
// Transparent, so the 3D world shows through behind the reveal
.next-page {
  border-top: 1px solid var(--border);
}

// Pinned version: the stage sticks while the extra height scrolls past
.next-page.is-auto {
  height: 170svh;
}

.next-page__stage {
  position: relative;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 2rem;
  min-height: 70svh;
  padding: 4rem 1rem;

  .is-auto & {
    position: sticky;
    top: 0;
    height: 100svh;
  }
}

// Spread sentence: four words that start bunched in the centre and drift to their
// columns on a 12-column grid as the reveal fills
.next-page__sentence {
  position: absolute;
  // Clear of the fixed header, a little above the ring
  inset: 24% 0 auto;
  display: none;

  @media (min-width: 768px) {
    display: block;
  }
}

.next-page__word {
  --target: 0;
  position: absolute;
  left: 50%;
  white-space: nowrap;
  transform: translateX(calc(-50% + var(--target) * var(--spread, 0) * 1vw));
}

// Column targets, in vw from the centre: columns 1-2, 4, near-right, and the last two
.next-page__word--0 {
  --target: -40;
}
.next-page__word--1 {
  --target: -17;
}
.next-page__word--2 {
  --target: 22;
}
.next-page__word--3 {
  --target: 40;
}

// Phones: one centred line instead of the spread
.next-page__line {
  @media (min-width: 768px) {
    display: none;
  }
}

.next-page__link {
  display: grid;
  justify-items: center;
  gap: 1.25rem;
  text-align: center;

  &:hover .next-page__title {
    color: var(--primary);
  }
}

.next-page__ring-wrap {
  position: relative;
  display: grid;
  place-items: center;
  width: 7rem;
  aspect-ratio: 1;
}

.next-page__ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.next-page__track,
.next-page__fill {
  fill: none;
  stroke-width: 2;
}

.next-page__track {
  stroke: rgba(var(--primary-rgb), 0.35);
}

.next-page__fill {
  stroke: var(--primary);
  stroke-linecap: round;
}

.next-page__arrow {
  font-size: 1.5rem;
  color: var(--primary);
}

.next-page__hint {
  color: var(--foreground-muted);
}

.next-page__title {
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 8vw, 5.5rem);
  line-height: 1;
  transition: color 0.3s var(--ease-out);
}
</style>
