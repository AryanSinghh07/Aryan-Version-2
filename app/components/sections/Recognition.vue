<script setup lang="ts">
import { gsap } from 'gsap'

// Ruled list of awards. On mouse/trackpad devices a proof card follows the cursor while a row
// is hovered: the first proof photo when one exists (content/recognition.json "images"),
// otherwise a badge with the award's number, type and year. Decorative only: every detail is
// already in the row itself.
const { data: recognition } = await useRecognition()

const enabled = ref(false)
const active = ref(-1)
const card = ref<HTMLElement | null>(null)
const activeItem = computed(() => recognition.value?.items[active.value])

let moveX: gsap.QuickToFunc | null = null
let moveY: gsap.QuickToFunc | null = null
let tilt: gsap.QuickToFunc | null = null
let lastX = 0

onMounted(async () => {
  if (!hasFinePointer() || prefersReducedMotion()) return
  enabled.value = true
  await nextTick()
  if (!card.value) return
  gsap.set(card.value, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.8 })
  moveX = gsap.quickTo(card.value, 'x', { duration: 0.6, ease: 'power3.out' })
  moveY = gsap.quickTo(card.value, 'y', { duration: 0.6, ease: 'power3.out' })
  tilt = gsap.quickTo(card.value, 'rotation', { duration: 0.5, ease: 'power3.out' })
})

function onMove(e: PointerEvent) {
  if (!moveX || !moveY || !tilt) return
  moveX(e.clientX)
  moveY(e.clientY - 40)
  // Lean in the direction of travel
  tilt(Math.max(-12, Math.min(12, (e.clientX - lastX) * 0.6)))
  lastX = e.clientX
}

function show(i: number, e: PointerEvent) {
  if (!enabled.value || !card.value) return
  if (active.value === -1) {
    // Appear at the pointer, not fly in from the last spot
    gsap.set(card.value, { x: e.clientX, y: e.clientY - 40 })
    lastX = e.clientX
  }
  active.value = i
  gsap.to(card.value, {
    autoAlpha: 1,
    scale: 1,
    duration: 0.35,
    ease: 'power3.out',
    overwrite: 'auto',
  })
}

function hide() {
  if (!enabled.value || !card.value) return
  active.value = -1
  tilt?.(0)
  gsap.to(card.value, {
    autoAlpha: 0,
    scale: 0.8,
    duration: 0.3,
    ease: 'power2.in',
    overwrite: 'auto',
  })
}
</script>

<template>
  <section
    v-if="recognition"
    class="recognition section container"
    aria-labelledby="recognition-title"
  >
    <div class="section__head">
      <UiSectionLabel :index="4" label="Recognition" />
      <h2 id="recognition-title" v-reveal class="t-h2">
        <UiAccentText :text="recognition.headline" />
      </h2>
    </div>

    <ol role="list" class="recognition__list" @pointerleave="hide">
      <li
        v-for="(item, i) in recognition.items"
        :key="item.id"
        class="recognition__row"
        :class="{ 'is-active': active === i }"
        @pointerenter="show(i, $event)"
        @pointermove="onMove"
      >
        <span class="recognition__index t-label">[{{ projectNumber(i + 1) }}]</span>
        <h3 class="recognition__title t-h3">{{ item.title }}</h3>
        <span class="recognition__type t-label t-muted">{{ item.type }}</span>
        <p class="recognition__detail">{{ item.detail }}</p>
      </li>
    </ol>

    <Teleport to="body">
      <div v-if="enabled" ref="card" class="proof" aria-hidden="true">
        <template v-if="activeItem">
          <img
            v-if="activeItem.images?.[0]"
            :src="activeItem.images?.[0]"
            alt=""
            class="proof__image"
          />
          <div v-else class="proof__badge">
            <span class="proof__number">{{ projectNumber(active + 1) }}</span>
            <span class="proof__type t-label">{{ activeItem.type }}</span>
            <span class="proof__title">{{ activeItem.title }}</span>
            <span v-if="activeItem.year" class="proof__year t-label">{{ activeItem.year }}</span>
          </div>
        </template>
      </div>
    </Teleport>
  </section>
</template>

<style scoped lang="scss">
.recognition__list {
  border-top: 1px solid var(--border);
}

.recognition__row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1.25rem;
  padding-block: 1.75rem;
  border-bottom: 1px solid var(--border);
  transition:
    background-color 0.25s ease,
    padding 0.35s cubic-bezier(0.22, 1, 0.36, 1);

  &:hover,
  &.is-active {
    background: rgba(var(--primary-rgb), 0.05);
  }

  @media (min-width: 1024px) {
    grid-template-columns: 4rem minmax(0, 1.4fr) 10rem minmax(0, 1.6fr);
    align-items: baseline;

    &.is-active {
      padding-inline: 1rem;
    }
  }
}

.recognition__index {
  color: var(--primary);
}

.recognition__type,
.recognition__detail {
  grid-column: 2;

  @media (min-width: 1024px) {
    grid-column: auto;
  }
}

// Follows the cursor (teleported to <body>, positioned by GSAP)
.proof {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 300;
  width: 15rem;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: 1rem;
  pointer-events: none;
  box-shadow: 0 1.5rem 4rem rgba(var(--color-deep-plum-rgb), 0.35);
}

.proof__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.proof__badge {
  display: grid;
  align-content: space-between;
  gap: 0.75rem;
  height: 100%;
  padding: 1.25rem;
  color: var(--on-primary);
  background:
    radial-gradient(circle at 75% 20%, rgba(var(--color-lavender-rgb), 0.6), transparent 55%),
    linear-gradient(160deg, var(--primary), var(--primary-active));
}

.proof__number {
  font-family: var(--font-display);
  font-size: 5rem;
  line-height: 0.85;
}

.proof__type {
  justify-self: start;
  padding: 0.35em 0.8em;
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
}

.proof__title {
  font-family: var(--font-display);
  font-size: 1.6rem;
  line-height: 1;
  text-transform: uppercase;
}

.proof__year {
  opacity: 0.8;
}
</style>
