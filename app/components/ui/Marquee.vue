<script setup lang="ts">
import { gsap } from 'gsap'

// Infinite keyword strip. Two identical groups slide by exactly one group width, so the loop
// is seamless. With JavaScript, GSAP drives it: scrolling speeds it up and scrolling up turns
// it around. Without JavaScript a CSS animation runs instead; with reduced motion it stays still.
const props = withDefaults(
  defineProps<{
    items: string[]
    separator?: string
    /** Seconds for one full loop */
    duration?: number
    reverse?: boolean
    /** Times the items repeat inside each group, so a group is wider than the screen */
    repeat?: number
  }>(),
  { separator: '✦', duration: 30, reverse: false, repeat: 3 }
)

const groupItems = computed(() => Array.from({ length: props.repeat }, () => props.items).flat())

const root = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
const driven = ref(false)
const lenis = useLenis()

/** Extra speed per unit of scroll velocity, and the most it can add */
const BOOST = 0.12
const MAX_BOOST = 6

let x = 0
let speed = 1 // eased multiplier, includes direction
let groupWidth = 0
let visible = true
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null

function tick(_time: number, deltaMs: number) {
  if (!visible || !track.value || !groupWidth) return
  const dt = Math.min(deltaMs / 1000, 0.1)
  const velocity = lenis?.velocity ?? 0
  const base = props.reverse ? -1 : 1
  // Scrolling up flips the direction; faster scrolling adds speed
  const direction = velocity < -0.5 ? -base : base
  const target = direction * (1 + Math.min(Math.abs(velocity) * BOOST, MAX_BOOST))
  speed += (target - speed) * Math.min(dt * 4, 1)
  x -= (groupWidth / props.duration) * speed * dt
  x = ((x % groupWidth) - groupWidth) % groupWidth // keep within one group width
  track.value.style.transform = `translate3d(${x}px, 0, 0)`
}

onMounted(() => {
  if (prefersReducedMotion() || !track.value || !root.value) return
  driven.value = true
  const measure = () => {
    groupWidth = (track.value?.children[0] as HTMLElement | undefined)?.offsetWidth ?? 0
  }
  measure()
  resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(track.value)
  // Only animate while on screen
  intersectionObserver = new IntersectionObserver(([entry]) => (visible = !!entry?.isIntersecting))
  intersectionObserver.observe(root.value)
  gsap.ticker.add(tick)
})

onBeforeUnmount(() => {
  gsap.ticker.remove(tick)
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
})
</script>

<template>
  <div ref="root" class="marquee" :style="{ '--marquee-duration': `${duration}s` }">
    <p class="sr-only">{{ items.join(', ') }}</p>
    <div
      ref="track"
      class="marquee__track"
      :class="{ 'marquee__track--reverse': reverse, 'is-driven': driven }"
      aria-hidden="true"
    >
      <div v-for="g in 2" :key="g" class="marquee__group">
        <template v-for="(item, i) in groupItems" :key="`${g}-${i}`">
          <span class="marquee__item">{{ item }}</span>
          <span class="marquee__separator">{{ separator }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.marquee {
  overflow: hidden;
  width: 100%;
  user-select: none;
}

.marquee__track {
  display: flex;
  width: max-content;
  animation: marquee var(--marquee-duration) linear infinite;
}

// GSAP is driving it: the CSS loop steps aside
.marquee__track.is-driven {
  animation: none;
  will-change: transform;
}

.marquee__track--reverse {
  animation-direction: reverse;
}

.marquee__group {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.marquee__item,
.marquee__separator {
  padding-inline: 0.5em;
  white-space: nowrap;
}

.marquee__separator {
  color: var(--primary);
}

@keyframes marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .marquee__track {
    animation: none;
  }
}
</style>
