<script setup lang="ts">
import { gsap } from 'gsap'
import type { ProjectsCollectionItem } from '@nuxt/content'
import type { CarouselItem } from '~/stores/app'

// The Work page as a 3D carousel. The panels are drawn by the WebGL world (world/Carousel);
// this is the real interface on top: title, description, spec line, filters, pagination and
// the links. Wheel, swipe and arrow keys turn the ring one project at a time (the same scene
// control as the home hero); past the last project the page scrolls on to the footer.
// Clicking the centred panel (or Enter) opens the project; clicking a side panel brings it
// to the centre.
const props = defineProps<{ projects: ProjectsCollectionItem[] }>()
const emit = defineEmits<{ ready: [] }>()

const store = useAppStore()
const router = useRouter()
const lenis = useLenis()

// Filters: by domain and by technology
const domain = ref<string>('All')
const stack = ref<string>('All')
const menuOpen = ref(false)
const domains = computed(() => DOMAINS.filter((d) => props.projects.some((p) => p.domain === d)))
/** The technologies that appear in more than one project, most used first */
const stacks = computed(() => {
  const counts = new Map<string, number>()
  for (const p of props.projects) for (const s of p.stack) counts.set(s, (counts.get(s) ?? 0) + 1)
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([s]) => s)
    .slice(0, 6)
})
const visible = computed(() =>
  props.projects.filter(
    (p) =>
      (domain.value === 'All' || p.domain === domain.value) &&
      (stack.value === 'All' || p.stack.includes(stack.value))
  )
)
const items = computed<CarouselItem[]>(() =>
  visible.value.map((p) => ({
    slug: p.slug,
    number: projectNumber(p.order),
    title: p.title,
    subtitle: p.subtitle,
    domain: p.domain,
    color: DOMAIN_COLORS[p.domain as Domain] ?? DOMAIN_COLORS['Full Stack'],
    year: p.year,
  }))
)

const root = ref<HTMLElement | null>(null)
const info = ref<HTMLElement | null>(null)
const spec = ref<HTMLElement | null>(null)

// The ring turns to a project; the title, description and spec line change with it
function transition(from: number, to: number, direction: 1 | -1) {
  const state = store.carousel
  if (!state) return null
  const tl = gsap.timeline()
  tl.to(state, { index: to, duration: 0.9, ease: 'power3.inOut' }, 0)
  const lines = info.value?.querySelectorAll('.carousel__swap') ?? []
  tl.to(lines, { yPercent: -110 * direction, duration: 0.3, ease: 'power2.in', stagger: 0.03 }, 0)
  tl.call(() => (shown.value = to), [], 0.32)
  tl.fromTo(
    lines,
    { yPercent: 110 * direction },
    { yPercent: 0, duration: 0.6, ease: 'power3.out', stagger: 0.04 },
    0.34
  )
  return tl
}

const { current, locked, goTo, start, stop, release } = useScenes({
  count: () => items.value.length,
  transition,
  // Past the last project: glide down to the footer
  onRelease: () => {
    if (root.value) lenis?.scrollTo(root.value.offsetHeight, { duration: 1.2 })
  },
})

/** The project shown in the info panel (changes mid-transition, behind the mask) */
const shown = ref(0)
const active = computed(() => items.value[shown.value] ?? items.value[0])
const total = computed(() => items.value.length)

const specText = computed(() => {
  const p = visible.value[shown.value]
  return p
    ? `PRJCT /${projectNumber(p.order)} · ${p.year} · ${p.type} · ${p.stack.slice(0, 3).join(', ')}`
    : ''
})

// The spec line decodes each time a new project arrives. Runs after Vue has written the new
// text, and decodes to that text (the element shows the old one until the scramble starts).
watch(
  specText,
  (text) => {
    if (!spec.value || prefersReducedMotion()) return
    gsap.killTweensOf(spec.value)
    gsap.to(spec.value, {
      duration: 0.7,
      scrambleText: {
        text,
        chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/',
        speed: 0.6,
      },
    })
  },
  { flush: 'post' }
)

// Hand the panels to the WebGL world; filtering rebuilds them and starts from the first
watch(
  items,
  (list) => {
    if (!store.carousel) return
    store.carousel.items = list
    store.carousel.index = 0
    current.value = 0
    shown.value = 0
  },
  { deep: false }
)

function choose(kind: 'domain' | 'stack', value: string) {
  if (kind === 'domain') domain.value = value
  else stack.value = value
}

function open(i: number) {
  const item = items.value[i]
  const state = store.carousel
  if (!item || !state || state.exiting) return
  state.exiting = true
  // The other panels clear away and the chosen one comes forward, then the page changes
  setTimeout(() => void router.push(`/work/${item.slug}`), 550)
}

// Clicks on the stage (not on its controls): the centred panel opens, a side panel centres
function onStageClick(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('a, button, input, label, .carousel__menu')) return
  const hovered = store.carouselHover
  if (hovered < 0) return
  if (hovered === current.value) open(hovered)
  else goTo(hovered)
}

function onKey(e: KeyboardEvent) {
  if (!locked.value || e.key !== 'Enter') return
  if ((e.target as HTMLElement | null)?.closest('a, button, input, select, textarea')) return
  open(current.value)
}

const cursor = computed(() => (store.carouselHover >= 0 ? 'View' : undefined))

let stopEntered: (() => void) | undefined
onMounted(() => {
  store.carousel = { items: items.value, index: 0, exiting: false }
  emit('ready')
  window.addEventListener('keydown', onKey)
  const begin = () => start(window.scrollY < 5)
  if (store.entered) begin()
  else
    stopEntered = watch(
      () => store.entered,
      (on) => on && (stopEntered?.(), begin())
    )
})

onBeforeUnmount(() => {
  stopEntered?.()
  window.removeEventListener('keydown', onKey)
  stop()
  store.carousel = null
  store.carouselHover = -1
})
</script>

<template>
  <section
    ref="root"
    class="carousel"
    aria-labelledby="carousel-title"
    :data-cursor="cursor"
    @click="onStageClick"
  >
    <h1 id="carousel-title" class="sr-only">Work</h1>

    <div v-if="active" ref="info" class="carousel__info">
      <p class="carousel__kicker t-label t-muted">
        <span class="carousel__swap-wrap"
          ><span class="carousel__swap">[{{ active.number }}] · {{ active.domain }}</span></span
        >
      </p>
      <h2 class="carousel__title">
        <span class="carousel__hook" aria-hidden="true">↪</span>
        <span class="carousel__swap-wrap"
          ><NuxtLink :to="`/work/${active.slug}`" class="carousel__swap carousel__link">{{
            active.title
          }}</NuxtLink></span
        >
      </h2>
      <p class="carousel__desc t-label">
        <span class="carousel__swap-wrap"
          ><span class="carousel__swap">{{ active.subtitle }}</span></span
        >
        <span class="carousel__swap-wrap"
          ><span class="carousel__swap">{{ active.domain }} / {{ active.year }}</span></span
        >
      </p>
      <p ref="spec" class="carousel__spec t-label" :data-text="specText" aria-hidden="true">
        {{ specText }}
      </p>
    </div>

    <div class="carousel__controls">
      <div class="carousel__filter">
        <UiGlassButton
          class="carousel__filter-button"
          :aria-expanded="menuOpen"
          aria-controls="carousel-menu"
          @click="menuOpen = !menuOpen"
        >
          <span class="carousel__filter-icon" aria-hidden="true">⌖</span> Filter
        </UiGlassButton>
        <div v-show="menuOpen" id="carousel-menu" class="carousel__menu">
          <fieldset class="carousel__group">
            <legend class="t-label t-muted">Domain</legend>
            <label class="carousel__option">
              <input
                type="radio"
                name="carousel-domain"
                :checked="domain === 'All'"
                @change="choose('domain', 'All')"
              />
              <span>All</span>
            </label>
            <label v-for="d in domains" :key="d" class="carousel__option">
              <input
                type="radio"
                name="carousel-domain"
                :checked="domain === d"
                @change="choose('domain', d)"
              />
              <span
                ><i class="carousel__dot" :style="{ background: DOMAIN_COLORS[d] }" />{{ d }}</span
              >
            </label>
          </fieldset>
          <fieldset class="carousel__group">
            <legend class="t-label t-muted">Stack</legend>
            <label class="carousel__option">
              <input
                type="radio"
                name="carousel-stack"
                :checked="stack === 'All'"
                @change="choose('stack', 'All')"
              />
              <span>All</span>
            </label>
            <label v-for="s in stacks" :key="s" class="carousel__option">
              <input
                type="radio"
                name="carousel-stack"
                :checked="stack === s"
                @change="choose('stack', s)"
              />
              <span>{{ s }}</span>
            </label>
          </fieldset>
        </div>
      </div>

      <nav class="carousel__pages" aria-label="Projects">
        <span class="t-label">{{ projectNumber(current + 1) }}</span>
        <ol role="list" class="carousel__ticks">
          <li v-for="(item, i) in items" :key="item.slug">
            <button
              type="button"
              class="carousel__tick"
              :aria-label="`Project ${i + 1}: ${item.title}`"
              :aria-current="i === current ? 'true' : undefined"
              @click="goTo(i)"
            />
          </li>
        </ol>
        <span class="t-label t-muted">{{ projectNumber(total) }}</span>
      </nav>

      <p class="carousel__links t-label">
        <NuxtLink to="/work?view=grid" class="carousel__skip">Grid view</NuxtLink>
        <button type="button" class="carousel__skip" @click="release()">Skip ↓</button>
      </p>
    </div>

    <p class="sr-only" aria-live="polite">
      Project {{ current + 1 }} of {{ total }}: {{ items[current]?.title }}
    </p>
  </section>
</template>

<style scoped lang="scss">
.carousel {
  position: relative;
  height: 100svh;
}

// Bottom left: the project in front
.carousel__info {
  position: absolute;
  left: max(1rem, 4vw);
  bottom: 2rem;
  display: grid;
  gap: 0.6rem;
  max-width: min(32rem, 42vw);

  @media (max-width: 767px) {
    left: 1rem;
    right: 1rem;
    bottom: 9rem;
    max-width: none;
  }
}

.carousel__swap-wrap {
  display: block;
  overflow: hidden;
}

.carousel__swap {
  display: inline-block;
}

.carousel__title {
  display: flex;
  align-items: baseline;
  gap: 0.35em;
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 5vw, 4.5rem);
  font-weight: 400;
  line-height: 1;
}

.carousel__hook {
  font-size: 0.55em;
  color: var(--primary);
}

.carousel__link:hover {
  color: var(--primary);
}

.carousel__desc {
  display: grid;
  gap: 0.15rem;
  text-transform: uppercase;
}

.carousel__spec {
  color: var(--primary);
  font-size: 0.6875rem;
}

// Bottom centre: filter, then pagination
.carousel__controls {
  position: absolute;
  left: 50%;
  bottom: 2rem;
  display: grid;
  justify-items: center;
  gap: 1rem;
  transform: translateX(-50%);
}

.carousel__filter {
  position: relative;
}

.carousel__filter-icon {
  color: var(--primary);
}

// Glass menu above the button, one column per list
.carousel__menu {
  position: absolute;
  bottom: calc(100% + 0.75rem);
  left: 50%;
  display: flex;
  gap: 2rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  background: rgba(var(--surface-rgb), 0.85);
  backdrop-filter: blur(12px);
  box-shadow: 0 1rem 3rem rgba(var(--color-deep-plum-rgb), 0.25);
  transform: translateX(-50%);
  white-space: nowrap;
}

.carousel__group {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  border: 0;

  legend {
    margin-bottom: 0.5rem;
    padding: 0;
  }
}

.carousel__option {
  position: relative;
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    min-height: 32px;
    padding: 0.2em 0.6em;
    border-radius: 999px;
    transition: background-color 0.3s var(--ease-out);
  }

  &:hover span {
    background: rgba(var(--contrast-rgb), 0.1);
  }

  input:checked + span {
    background: rgba(var(--primary-rgb), 0.15);
    color: var(--primary);
  }

  input:focus-visible + span {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
}

.carousel__dot {
  width: 0.6em;
  height: 0.6em;
  border-radius: 50%;
}

.carousel__pages {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  font-variant-numeric: tabular-nums;
}

.carousel__ticks {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

// Thin ticks; the active one becomes a rounded box
.carousel__tick {
  position: relative;
  width: 24px;
  height: 32px;

  &::after {
    content: '';
    position: absolute;
    inset: 50% auto auto 50%;
    width: 1px;
    height: 14px;
    background: var(--foreground-muted);
    transform: translate(-50%, -50%);
    transition:
      width 0.4s var(--ease-out),
      background-color 0.3s var(--ease-out),
      border-radius 0.4s var(--ease-out);
  }

  &:hover::after {
    background: var(--primary);
  }

  &[aria-current='true']::after {
    width: 12px;
    border-radius: 4px;
    background: var(--primary);
  }
}

.carousel__links {
  display: flex;
  gap: 1.5rem;
}

.carousel__skip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  color: var(--foreground-muted);

  &:hover {
    color: var(--primary);
  }
}
</style>
