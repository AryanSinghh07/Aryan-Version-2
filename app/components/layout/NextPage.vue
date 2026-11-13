<script setup lang="ts">
// "Keep scrolling" to the next page: below the footer sits a short runway, and a ring fills
// as the visitor scrolls through it. When it is full, the next page opens. It is also a
// plain link (keyboard, screen readers, no JavaScript, reduced motion: no runway at all).
//
// Only the visitor's own scrolling (wheel, touch, keys) can trigger it, never a restored
// scroll position (Back) or a script, and the ring has to stay full for a moment.
const route = useRoute()
const router = useRouter()
const store = useAppStore()
const lenis = useLenis()
const { data: projects } = await useProjects()

const PAGES = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/work', label: 'Work' },
  { to: '/contact', label: 'Contact' },
]
/** Recent input counts as "the visitor is scrolling", ms */
const INPUT_WINDOW = 1000
/** How long the ring must stay full before the page changes, ms */
const HOLD = 350
const RADIUS = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const next = computed(() => {
  const path = normalizePath(route.path)
  if (path.startsWith('/work/')) {
    const list = projects.value ?? []
    const i = list.findIndex((p) => `/work/${p.slug}` === path)
    const project = i >= 0 ? list[(i + 1) % list.length] : undefined
    return project ? { to: `/work/${project.slug}`, label: project.title } : null
  }
  const i = PAGES.findIndex((p) => p.to === path)
  return i >= 0 ? PAGES[(i + 1) % PAGES.length]! : null
})

const runway = ref<HTMLElement | null>(null)
const progress = ref(0)
const auto = ref(false)
let lastInput = 0
let holdTimer: ReturnType<typeof setTimeout> | undefined
let fired = false

const offset = computed(() => CIRCUMFERENCE * (1 - progress.value))

function measure() {
  const el = runway.value
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  return Math.min(Math.max((window.innerHeight - rect.top) / Math.max(rect.height, 1), 0), 1)
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
  }
)

onBeforeUnmount(() => {
  clearTimeout(holdTimer)
  window.removeEventListener('wheel', onInput)
  window.removeEventListener('touchmove', onInput)
  window.removeEventListener('keydown', onInput)
  lenis?.off('scroll', update)
  window.removeEventListener('scroll', update)
  window.removeEventListener('resize', update)
})
</script>

<template>
  <div v-if="next" class="next-page">
    <NuxtLink :to="next.to" class="next-page__link container">
      <span class="t-label t-muted">{{ auto ? 'Keep scrolling' : 'Next page' }}</span>
      <span class="next-page__row">
        <svg class="next-page__ring" viewBox="0 0 48 48" aria-hidden="true">
          <circle class="next-page__track" cx="24" cy="24" :r="RADIUS" />
          <circle
            class="next-page__fill"
            cx="24"
            cy="24"
            :r="RADIUS"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="offset"
          />
        </svg>
        <span class="next-page__title t-h2">{{ next.label }}</span>
      </span>
    </NuxtLink>
    <div v-if="auto" ref="runway" class="next-page__runway" aria-hidden="true" />
  </div>
</template>

<style scoped lang="scss">
.next-page {
  border-top: 1px solid var(--border);
}

.next-page__link {
  display: grid;
  gap: 1rem;
  padding-block: 3rem;

  &:hover .next-page__title {
    color: var(--primary);
  }
}

.next-page__row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.next-page__ring {
  flex: none;
  width: clamp(2.5rem, 5vw, 3.5rem);
  height: auto;
  transform: rotate(-90deg);
}

.next-page__track,
.next-page__fill {
  fill: none;
  stroke-width: 2;
}

.next-page__track {
  stroke: var(--border);
}

.next-page__fill {
  stroke: var(--primary);
  stroke-linecap: round;
}

// The scroll runway: the ring fills while this passes through the screen
.next-page__runway {
  height: 45svh;
}
</style>
