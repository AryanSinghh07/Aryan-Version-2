<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { ProjectsCollectionItem } from '@nuxt/content'

// Every project as a ruled index: number, title, domain and year, filterable by domain.
// With a mouse, a preview of the project's cover follows the pointer over the list, tilting
// with its movement and wiping from one cover to the next; the row under the pointer lights
// up and its title slides right. On touch screens each row carries a small thumbnail instead.
//
// Motion: the rows draw in line by line as the list scrolls in, and again after a filter.
const props = defineProps<{ projects: ProjectsCollectionItem[] }>()

const root = ref<HTMLElement | null>(null)
const preview = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)

const active = ref('All')
const hovered = ref<string | null>(null)
const filters = computed(() => [
  'All',
  ...DOMAINS.filter((d) => props.projects.some((p) => p.domain === d)),
])
const countOf = (f: string) =>
  f === 'All' ? props.projects.length : props.projects.filter((p) => p.domain === f).length
const visible = computed(() =>
  props.projects.filter((p) => active.value === 'All' || p.domain === active.value)
)
const colorOf = (p: ProjectsCollectionItem) =>
  DOMAIN_COLORS[p.domain as Domain] ?? DOMAIN_COLORS['Full Stack']

let ctx: gsap.Context | null = null
let follow: { x: (v: number) => void; y: (v: number) => void; r: (v: number) => void } | null = null
let lastX = 0
const fine = ref(false)

function rowsIn() {
  const rows = list.value?.querySelectorAll('.row')
  if (!rows?.length) return
  gsap.fromTo(
    rows,
    { '--line': 0, autoAlpha: 0, y: 24 },
    { '--line': 1, autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out' }
  )
}

function choose(f: string) {
  if (f === active.value) return
  active.value = f
  void nextTick(() => {
    // The list changed height: everything below measures again
    ScrollTrigger.refresh()
    if (!prefersReducedMotion()) rowsIn()
  })
}

function onMove(e: MouseEvent) {
  if (!follow) return
  follow.x(e.clientX)
  follow.y(e.clientY)
  // Tilts with the pointer's speed, then settles
  follow.r(gsap.utils.clamp(-12, 12, (e.clientX - lastX) * 0.6))
  lastX = e.clientX
}

function enter(slug: string, e: MouseEvent) {
  if (!fine.value || !preview.value) return
  if (!hovered.value) {
    // Appears right at the pointer
    gsap.set(preview.value, { x: e.clientX, y: e.clientY })
    lastX = e.clientX
  }
  hovered.value = slug
  gsap.to(preview.value, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'expo.out' })
}

function leave() {
  hovered.value = null
  if (preview.value)
    gsap.to(preview.value, { scale: 0.6, autoAlpha: 0, duration: 0.4, ease: 'power3.in' })
}

onMounted(() => {
  const el = root.value
  fine.value = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  if (!el) return
  if (preview.value && fine.value) {
    gsap.set(preview.value, { xPercent: -50, yPercent: -50, scale: 0.6, autoAlpha: 0 })
    follow = {
      x: gsap.quickTo(preview.value, 'x', { duration: 0.6, ease: 'power3.out' }),
      y: gsap.quickTo(preview.value, 'y', { duration: 0.6, ease: 'power3.out' }),
      r: gsap.quickTo(preview.value, 'rotation', { duration: 0.8, ease: 'power3.out' }),
    }
  }
  if (prefersReducedMotion()) return
  ctx = gsap.context(() => {
    const rows = el.querySelectorAll('.row')
    gsap.set(rows, { '--line': 0, autoAlpha: 0, y: 24 })
    gsap.to(rows, {
      '--line': 1,
      autoAlpha: 1,
      y: 0,
      duration: 1,
      stagger: 0.07,
      ease: 'expo.out',
      scrollTrigger: { trigger: list.value, start: 'top 95%', once: true },
    })
  }, el)
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <section ref="root" class="index section container" aria-labelledby="index-title">
    <div class="index__head">
      <div class="index__titles">
        <UiSectionLabel :index="3" label="Index" />
        <h2 id="index-title" v-reveal class="index__title t-h2">
          <UiAccentText text="Every *project*" />
        </h2>
      </div>
      <div class="index__filters" role="group" aria-label="Filter projects by domain">
        <button
          v-for="f in filters"
          :key="f"
          type="button"
          class="index__filter t-label"
          :aria-pressed="active === f"
          @click="choose(f)"
        >
          {{ f }}<sup>{{ countOf(f) }}</sup>
        </button>
      </div>
    </div>

    <div class="index__columns t-label t-muted" aria-hidden="true">
      <span>No.</span><span>Project</span><span>Domain</span><span>Year</span>
    </div>

    <ul ref="list" role="list" class="index__list" @mousemove="onMove" @mouseleave="leave">
      <li
        v-for="p in visible"
        :key="p.slug"
        class="row"
        :class="{ 'is-dim': hovered && hovered !== p.slug }"
        :style="{ '--tint': colorOf(p) }"
      >
        <NuxtLink
          :to="`/work/${p.slug}`"
          class="row__link"
          data-cursor="View"
          @mouseenter="enter(p.slug, $event)"
        >
          <span class="row__num t-label">({{ projectNumber(p.order) }})</span>
          <span class="row__thumb" aria-hidden="true">
            <img v-if="p.cover" :src="p.cover" alt="" loading="lazy" decoding="async" />
          </span>
          <span class="row__name">
            <span class="row__title">{{ p.title }}</span>
            <span class="row__sub t-muted">{{ p.subtitle }}</span>
          </span>
          <span class="row__domain t-label">
            <i class="row__dot" aria-hidden="true" />{{ p.domain }}
          </span>
          <span class="row__year t-label">{{ p.year }}</span>
          <span class="row__arrow" aria-hidden="true">↗</span>
        </NuxtLink>
      </li>
    </ul>
    <p class="sr-only" aria-live="polite">Showing {{ visible.length }} projects</p>

    <div ref="preview" class="index__preview" aria-hidden="true">
      <img
        v-for="p in projects"
        :key="p.slug"
        :src="p.cover"
        alt=""
        loading="lazy"
        decoding="async"
        :class="{ 'is-active': hovered === p.slug }"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.index__head {
  display: grid;
  gap: 2rem;
  margin-bottom: clamp(2.5rem, 5vw, 4rem);

  @media (min-width: 900px) {
    grid-template-columns: 1fr auto;
    align-items: end;
  }
}

.index__titles {
  display: grid;
  gap: 1.25rem;
}

.index__title {
  margin: 0;
}

.index__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.index__filter {
  min-height: 40px;
  padding: 0.5em 1.1em;
  border: 1px solid color-mix(in srgb, var(--foreground) 16%, transparent);
  border-radius: 999px;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease,
    color 0.3s ease;

  sup {
    margin-left: 0.3em;
    font-size: 0.7em;
    opacity: 0.6;
  }

  &:hover {
    border-color: var(--primary);
  }

  &[aria-pressed='true'] {
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
  }
}

// The columns: number, project, domain, year, arrow
.index__columns,
.row__link {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr) 11rem 4rem 2.5rem;
  align-items: center;
  gap: 1.5rem;
}

.index__columns {
  padding-bottom: 1rem;
  font-size: 0.7rem;

  span:nth-child(4) {
    grid-column: 4 / 6;
  }

  @media (max-width: 899px) {
    display: none;
  }
}

.index__list {
  margin: 0;
  padding: 0;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 14%, transparent);
}

.row {
  --line: 1;

  position: relative;

  // The rule under the row draws in from the left
  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: color-mix(in srgb, var(--foreground) 14%, transparent);
    transform: scaleX(var(--line));
    transform-origin: 0 50%;
  }

  &.is-dim .row__link {
    opacity: 0.35;
  }
}

.row__link {
  position: relative;
  padding-block: clamp(1.25rem, 2.4vw, 2rem);
  isolation: isolate;
  transition: opacity 0.4s ease;

  // A wash of the domain colour sweeps in under the hovered row
  &::before {
    content: '';
    position: absolute;
    inset: 0 calc(-1 * max(1rem, 4vw));
    z-index: -1;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--tint) 14%, transparent),
      transparent 70%
    );
    transform: scaleX(0);
    transform-origin: 0 50%;
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &:hover::before,
  &:focus-visible::before {
    transform: scaleX(1);
  }
}

.row__num {
  color: var(--foreground-muted);
  font-variant-numeric: tabular-nums;
}

.row__thumb {
  display: none;
}

.row__name {
  display: grid;
  gap: 0.3rem;
  min-width: 0;
}

.row__title {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 3.6vw, 3.5rem);
  line-height: 1;
  transition:
    transform 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.3s ease;

  .row__link:hover &,
  .row__link:focus-visible & {
    transform: translateX(1rem);
    color: var(--primary);
  }
}

.row__sub {
  font-size: 0.9rem;
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.04s;

  .row__link:hover &,
  .row__link:focus-visible & {
    transform: translateX(1rem);
  }
}

.row__domain {
  display: inline-flex;
  align-items: center;
  gap: 0.55em;
  font-size: 0.72rem;
}

.row__dot {
  width: 0.5em;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--tint);
  box-shadow: 0 0 10px var(--tint);
}

.row__year {
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.row__arrow {
  display: grid;
  place-items: center;
  width: 2.5rem;
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--foreground) 18%, transparent);
  border-radius: 50%;
  transition:
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    background-color 0.3s ease,
    border-color 0.3s ease,
    color 0.3s ease;

  .row__link:hover &,
  .row__link:focus-visible & {
    transform: rotate(45deg);
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
  }
}

// Phones and tablets: a thumbnail, the title, and the domain and year below it
@media (max-width: 899px) {
  .row__link {
    grid-template-columns: 4.5rem minmax(0, 1fr) auto;
    grid-template-areas:
      'thumb name arrow'
      'thumb meta arrow';
    gap: 0.4rem 1rem;
  }

  .row__num {
    display: none;
  }

  .row__thumb {
    grid-area: thumb;
    display: block;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 0.75rem;
    background: color-mix(in srgb, var(--foreground) 6%, transparent);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .row__name {
    grid-area: name;
  }

  .row__domain {
    grid-area: meta;
  }

  .row__year {
    display: none;
  }

  .row__arrow {
    grid-area: arrow;
  }

  .row__sub {
    display: none;
  }
}

// The cover that follows the pointer; one image wipes up over the last
.index__preview {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 30;
  width: clamp(16rem, 24vw, 24rem);
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 1rem;
  background: var(--page-bg);
  box-shadow: 0 2rem 4rem rgba(0, 0, 0, 0.45);
  pointer-events: none;
  visibility: hidden;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    clip-path: inset(0 0 100% 0);
    transform: scale(1.15);
    transition:
      clip-path 0.7s cubic-bezier(0.77, 0, 0.18, 1),
      transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);

    &.is-active {
      z-index: 1;
      clip-path: inset(0 0 0 0);
      transform: scale(1);
    }
  }

  @media (hover: none), (pointer: coarse) {
    display: none;
  }
}
</style>
