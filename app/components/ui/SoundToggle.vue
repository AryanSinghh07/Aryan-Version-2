<script setup lang="ts">
import { gsap } from 'gsap'

// Sound on/off button with a small visualiser: bars driven by the master output's frequency
// data (Web Audio AnalyserNode). With sound off the bars lie flat; with reduced motion they
// show a still "on" pattern instead of moving.
const BARS = 4
const WIDTH = 22
const HEIGHT = 16

const store = useAppStore()
const { $sound } = useNuxtApp()
const hydrated = useHydrated()
const canvas = ref<HTMLCanvasElement | null>(null)

const heights = Array.from({ length: BARS }, () => 0.15)
const STILL = [0.45, 0.85, 0.6, 0.75]
let data: Uint8Array<ArrayBuffer> | null = null
let ctx: CanvasRenderingContext2D | null = null
let running = false
/** Keep drawing a little after any change, so colour transitions (theme, hover) are followed */
let awakeUntil = 0

function toggle() {
  store.setSound(!store.sound)
}

function targets(time: number) {
  const analyser = $sound.analyser
  const on = store.sound && store.entered
  if (!on) return heights.map(() => 0.15)
  if (prefersReducedMotion()) return STILL
  if (analyser && (!data || data.length !== analyser.frequencyBinCount)) {
    data = new Uint8Array(analyser.frequencyBinCount)
  }
  if (analyser && data) analyser.getByteFrequencyData(data)
  return heights.map((_, i) => {
    // Low and mid bins carry the pad; a slow wobble keeps the bars alive in quiet passages
    const level = data ? (data[1 + i * 3] ?? 0) / 255 : 0
    const wobble = 0.12 * Math.sin(time * (2.1 + i * 0.7) + i * 1.7)
    return Math.min(Math.max(0.2 + level * 0.9 + wobble, 0.15), 1)
  })
}

function draw(time: number, deltaMs: number) {
  const c = canvas.value
  if (!c || !ctx) return
  const goal = targets(time)
  const k = Math.min(1, (deltaMs / 1000) * 14)
  let settled = true
  for (let i = 0; i < BARS; i++) {
    const next = heights[i]! + (goal[i]! - heights[i]!) * k
    if (Math.abs(next - goal[i]!) > 0.002) settled = false
    heights[i] = next
  }

  const ratio = c.width / WIDTH
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = getComputedStyle(c).color
  const gap = 3
  const bar = (WIDTH - gap * (BARS - 1)) / BARS
  for (let i = 0; i < BARS; i++) {
    const h = Math.max(heights[i]! * HEIGHT, 2)
    ctx.beginPath()
    ctx.roundRect(i * (bar + gap), (HEIGHT - h) / 2, bar, h, bar / 2)
    ctx.fill()
  }

  // Off and settled: stop drawing until something changes
  if (settled && !(store.sound && store.entered) && performance.now() > awakeUntil) stop()
}

const tick = (time: number, deltaMs: number) => draw(time, deltaMs)

function start() {
  awakeUntil = performance.now() + 500
  if (running) return
  running = true
  gsap.ticker.add(tick)
}

function stop() {
  if (!running) return
  running = false
  gsap.ticker.remove(tick)
}

onMounted(() => {
  const c = canvas.value
  if (!c) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  c.width = Math.round(WIDTH * dpr)
  c.height = Math.round(HEIGHT * dpr)
  ctx = c.getContext('2d')
  draw(0, 1000)
  start()
})

// Redraw on any change that affects the bars (sound, entry, theme colour)
watch(
  () => [store.sound, store.entered, store.theme],
  () => start()
)

onBeforeUnmount(stop)
</script>

<template>
  <button
    type="button"
    class="sound-toggle"
    :aria-pressed="hydrated && store.sound"
    aria-label="Sound"
    data-sound="toggle"
    @click="toggle"
    @pointerenter="start"
    @pointerleave="start"
    @focus="start"
    @blur="start"
  >
    <canvas
      ref="canvas"
      class="sound-toggle__bars"
      :width="WIDTH"
      :height="HEIGHT"
      aria-hidden="true"
    />
  </button>
</template>

<style scoped lang="scss">
.sound-toggle {
  display: inline-grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  color: var(--foreground-muted);
  transition: color 0.25s ease;

  &:hover,
  &[aria-pressed='true'] {
    color: var(--primary);
  }
}

.sound-toggle__bars {
  width: 22px;
  height: 16px;
}
</style>
