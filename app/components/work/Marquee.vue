<script setup lang="ts">
import { gsap } from 'gsap'

// A band of the tools behind the projects, two rows sliding in opposite directions (the
// second in outline). Scrolling pushes them faster and leans them the way the page moves.
// Decorative: hidden from screen readers. With reduced motion it simply stands still.
const props = defineProps<{ words: string[] }>()

const root = ref<HTMLElement | null>(null)
const rows = computed(() => {
  const half = Math.ceil(props.words.length / 2)
  return [props.words.slice(0, half), props.words.slice(half)]
})

let tick: (() => void) | null = null
let observer: IntersectionObserver | null = null

onMounted(() => {
  const el = root.value
  if (!el || prefersReducedMotion()) return
  const tracks = [...el.querySelectorAll<HTMLElement>('.marquee__track')]
  const offsets = tracks.map(() => 0)
  let lastY = window.scrollY
  let boost = 0
  let skew = 0
  let visible = false
  observer = new IntersectionObserver(([entry]) => (visible = !!entry?.isIntersecting))
  observer.observe(el)

  tick = () => {
    const dt = Math.min(gsap.ticker.deltaRatio(60), 3)
    const y = window.scrollY
    const v = y - lastY
    lastY = y
    // Scrolling speeds the band up, then it eases back to its own pace
    boost += (Math.min(Math.abs(v), 120) * 0.12 - boost) * 0.08 * dt
    skew += (gsap.utils.clamp(-8, 8, -v * 0.25) - skew) * 0.1 * dt
    if (!visible) return
    tracks.forEach((track, i) => {
      const dir = i % 2 ? 1 : -1
      const half = track.scrollWidth / 2
      if (!half) return
      offsets[i] = gsap.utils.wrap(-half, 0, offsets[i]! + dir * (0.6 + boost) * dt)
      track.style.transform = `translate3d(${offsets[i]}px,0,0) skewX(${skew.toFixed(2)}deg)`
    })
  }
  gsap.ticker.add(tick)
})

onBeforeUnmount(() => {
  if (tick) gsap.ticker.remove(tick)
  observer?.disconnect()
})
</script>

<template>
  <div ref="root" class="marquee" aria-hidden="true">
    <div v-for="(row, r) in rows" :key="r" class="marquee__row" :class="{ 'is-outline': r % 2 }">
      <div class="marquee__track">
        <template v-for="copy in 4" :key="copy">
          <span v-for="w in row" :key="`${copy}-${w}`" class="marquee__item">
            {{ w }}<span class="marquee__star">✦</span>
          </span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.marquee {
  display: grid;
  gap: 0.25rem;
  padding: clamp(2rem, 6vw, 5rem) 0;
  overflow: hidden;
  border-block: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
  user-select: none;
}

.marquee__row {
  display: flex;
  overflow: hidden;
}

.marquee__track {
  display: flex;
  flex: none;
  will-change: transform;
}

.marquee__item {
  display: inline-flex;
  align-items: center;
  flex: none;
  gap: 0.35em;
  padding-right: 0.35em;
  font-family: var(--font-display);
  font-size: clamp(3rem, 8vw, 7.5rem);
  line-height: 1.05;
  white-space: nowrap;
  color: var(--foreground);

  .is-outline & {
    color: transparent;
    -webkit-text-stroke: 1px color-mix(in srgb, var(--foreground) 55%, transparent);
    font-style: italic;
  }
}

.marquee__star {
  font-family: var(--font-body);
  font-size: 0.32em;
  color: var(--primary);
  -webkit-text-stroke: 0;

  .is-outline & {
    color: var(--primary);
  }
}
</style>
