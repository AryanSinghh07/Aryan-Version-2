<script setup lang="ts">
import { gsap } from 'gsap'

// Number that counts up from 0 the first time it scrolls into view.
// The server renders the final number, so it is correct without JavaScript
// and for visitors who prefer reduced motion.
const props = withDefaults(
  defineProps<{
    value: number
    prefix?: string
    suffix?: string
    decimals?: number
    /** Seconds */
    duration?: number
  }>(),
  { prefix: '', suffix: '', decimals: 0, duration: 2 }
)

const el = ref<HTMLElement | null>(null)
const display = ref(props.value)
const formatted = computed(() => display.value.toFixed(props.decimals))

let tween: gsap.core.Tween | null = null
let animate = false

// Created in setup (not in onMounted) so Vue disconnects it automatically on unmount
const { stop } = useIntersectionObserver(
  el,
  ([entry]) => {
    if (!animate || !entry?.isIntersecting) return
    stop()
    const state = { n: 0 }
    tween = gsap.to(state, {
      n: props.value,
      duration: props.duration,
      ease: 'power2.out',
      onUpdate: () => {
        display.value = state.n
      },
    })
  },
  { threshold: 0.4 }
)

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stop()
    return
  }
  animate = true
  display.value = 0
})

// If the value changes after the count-up, show the new value straight away
watch(
  () => props.value,
  (value) => {
    tween?.kill()
    display.value = value
  }
)

onBeforeUnmount(() => tween?.kill())
</script>

<template>
  <span ref="el" class="counter">
    <span class="sr-only">{{ prefix }}{{ value.toFixed(decimals) }}{{ suffix }}</span>
    <span aria-hidden="true">{{ prefix }}{{ formatted }}{{ suffix }}</span>
  </span>
</template>

<style scoped lang="scss">
.counter {
  font-variant-numeric: tabular-nums;
}
</style>
