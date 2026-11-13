<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

import type { TextSide } from '~/webgl/config/scenes'

export interface SceneContent {
  label: string
  headline: string
  text: string
  /** Defaults: left, constellation */
  side?: TextSide
  particleShape?: string
}

// Full-screen scenes (home hero, about story), switched by wheel, swipe or arrow keys while
// page scroll is locked. Past the last scene the page scrolls normally.
// Without JavaScript, or with reduced motion, the scenes stay stacked and scroll like a page.
const props = defineProps<{
  scenes: SceneContent[]
  /** Small line under the first scene */
  intro?: string
  /** Names the scene set for screen readers ("Hero", "About") */
  label: string
}>()
const store = useAppStore()
const lenis = useLenis()
const route = useRoute()

const scenes = computed(() =>
  props.scenes.map((s) => ({
    ...s,
    side: s.side ?? 'left',
    particleShape: s.particleShape ?? 'constellation',
  }))
)
const total = computed(() => scenes.value.length)

// Tell the WebGL world which particle shape each scene shows on this page (set during server
// render too, so the shapes are ready before the page finishes loading)
store.heroScenes = scenes.value.map((s) => ({ shape: s.particleShape, side: s.side }))
store.scenesRoute = normalizePath(route.path)
const plain = (text: string) => text.replace(/\*/g, '')

const root = ref<HTMLElement | null>(null)
// Scene elements in DOM order (read from the DOM: a v-for ref array has no guaranteed order)
const sceneEls = shallowRef<HTMLElement[]>([])
const interactive = ref(false)
let splits: SplitText[] = []
let introTimeline: gsap.core.Timeline | null = null
let disposed = false
let stopEnteredWatch: (() => void) | undefined

const nav = () => root.value?.querySelector<HTMLElement>('.hero__nav') ?? []
const lines = (el?: HTMLElement) => (el ? [...el.querySelectorAll<HTMLElement>('.hero-line')] : [])
const metas = (el?: HTMLElement) =>
  el ? [...el.querySelectorAll<HTMLElement>('.scene__meta, .scene__intro')] : []

// One timeline per scene change: outgoing lines slide out of their masks, incoming slide in
function transition(from: number, to: number, direction: 1 | -1) {
  const outgoing = sceneEls.value[from]
  const incoming = sceneEls.value[to]
  if (!outgoing || !incoming) return null
  const outLines = lines(outgoing)
  const outMeta = metas(outgoing)

  // About 1.3s in total: the incoming scene starts before the outgoing one has fully left
  return gsap
    .timeline()
    .to(outLines, { yPercent: -110 * direction, duration: 0.5, stagger: 0.03, ease: 'power3.in' })
    .to(outMeta, { autoAlpha: 0, y: -16 * direction, duration: 0.35, ease: 'power2.in' }, 0)
    .set(incoming, { autoAlpha: 1 }, 0.45)
    .fromTo(
      lines(incoming),
      { yPercent: 110 * direction },
      { yPercent: 0, duration: 0.8, stagger: 0.05, ease: 'power4.out' },
      0.45
    )
    .fromTo(
      metas(incoming),
      { autoAlpha: 0, y: 16 * direction },
      { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' },
      0.55
    )
    .set(outgoing, { autoAlpha: 0 }, 0.6)
    .set([...outLines, ...outMeta], { clearProps: 'transform,opacity,visibility' }, 0.6)
}

const { current, locked, goTo, start, enter, release } = useScenes({
  count: total.value,
  transition,
  // Past the last scene: glide down to the content below the hero
  onRelease: () => {
    if (root.value) lenis?.scrollTo(root.value.offsetHeight, { duration: 1.2 })
  },
})

function playIntro() {
  const first = sceneEls.value[0]
  if (!first) return
  introTimeline = gsap
    .timeline()
    .fromTo(
      lines(first),
      { yPercent: 110 },
      { yPercent: 0, duration: 1.2, stagger: 0.08, ease: 'power4.out' }
    )
    .fromTo(metas(first), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8 }, '<0.3')
    .fromTo(nav(), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, '<0.2')
}

// True on the first page load; false when arriving through an in-site link or Back/Forward
const firstLoad = useNuxtApp().isHydrating

// Will this visit land below the hero? (browser reload part-way down, or Back to a saved spot)
function landsBelowHero() {
  if (firstLoad) return window.scrollY > 5
  const saved = (history.state as { scroll?: { top?: number } } | null)?.scroll?.top ?? 0
  return saved > 5
}

function begin() {
  if (disposed) return
  // Landing below the hero: show the last scene, ready for when the visitor scrolls back up
  if (landsBelowHero()) {
    const last = total.value - 1
    gsap.set(sceneEls.value, { autoAlpha: 0 })
    gsap.set(sceneEls.value[last] ?? [], { autoAlpha: 1 })
    gsap.set(lines(sceneEls.value[0]), { clearProps: 'transform' })
    gsap.set([...metas(sceneEls.value[0]), nav()].flat(), { autoAlpha: 1 })
    goToWithoutAnimation(last)
    start(false)
    return
  }
  playIntro()
  start(true)
}

// Jump straight to a scene (used when the page loads below the hero)
function goToWithoutAnimation(index: number) {
  current.value = index
  store.setScene(index)
}

function onNavClick(index: number) {
  if (!locked.value) enter()
  goTo(index)
}

onMounted(async () => {
  if (prefersReducedMotion() || !total.value) return
  interactive.value = true
  await nextTick()
  await document.fonts.ready
  // The visitor may have left the page while fonts were loading
  if (disposed || !root.value) return

  sceneEls.value = [...root.value.querySelectorAll<HTMLElement>(':scope > .scene')]
  // The hero just shrank from five screens to one: re-measure scroll-triggered reveals
  ScrollTrigger.refresh()

  splits = sceneEls.value.map((el) =>
    SplitText.create(el.querySelectorAll('.scene__split'), {
      type: 'lines',
      mask: 'lines',
      linesClass: 'hero-line',
      aria: 'auto',
      autoSplit: true,
    })
  )

  // Only the first scene is visible; its lines wait below their masks for the intro
  gsap.set(sceneEls.value, { autoAlpha: 0 })
  gsap.set(sceneEls.value[0] ?? [], { autoAlpha: 1 })
  gsap.set(lines(sceneEls.value[0]), { yPercent: 110 })
  gsap.set([...metas(sceneEls.value[0]), nav()].flat(), { autoAlpha: 0 })

  if (store.entered) begin()
  else {
    stopEnteredWatch = watch(
      () => store.entered,
      (entered) => {
        if (!entered) return
        stopEnteredWatch?.()
        begin()
      }
    )
  }
})

onBeforeUnmount(() => {
  disposed = true
  stopEnteredWatch?.()
  introTimeline?.kill()
  splits.forEach((s) => s.revert())
})
</script>

<template>
  <div v-if="total" ref="root" class="hero" :class="{ 'is-interactive': interactive }">
    <section
      v-for="(scene, i) in scenes"
      :key="scene.label"
      class="scene container"
      :class="[`scene--${scene.side}`, { 'is-active': interactive && current === i }]"
      :aria-label="`Scene ${i + 1} of ${total}`"
      :aria-hidden="interactive && current !== i ? 'true' : undefined"
    >
      <div class="scene__content">
        <div class="scene__meta">
          <UiTag :variant="i === total - 1 ? 'accent' : 'outline'">{{ scene.label }}</UiTag>
          <span class="t-label t-muted">
            [{{ projectNumber(i + 1) }}/{{ projectNumber(total) }}]
          </span>
        </div>

        <h1 v-if="i === 0" class="t-hero scene__split">
          <UiAccentText :text="scene.headline" />
        </h1>
        <h2 v-else class="t-h2 scene__split"><UiAccentText :text="scene.headline" /></h2>

        <p class="scene__text scene__split">{{ scene.text }}</p>

        <p v-if="i === 0 && intro" class="scene__intro t-label t-muted">{{ intro }}</p>
      </div>
    </section>

    <nav v-if="interactive" class="hero__nav container" :aria-label="`${label} scenes`">
      <ol role="list" class="hero__dots">
        <li v-for="(scene, i) in scenes" :key="scene.label">
          <button
            type="button"
            class="hero__dot"
            :aria-label="`Scene ${i + 1}: ${plain(scene.headline)}`"
            :aria-current="current === i ? 'step' : undefined"
            @click="onNavClick(i)"
          />
        </li>
      </ol>
      <span class="hero__count t-label" aria-hidden="true">
        {{ projectNumber(current + 1) }} / {{ projectNumber(total) }}
      </span>
      <button type="button" class="hero__skip t-label" @click="release()">Skip intro ↓</button>
    </nav>

    <p v-if="interactive" class="sr-only" aria-live="polite">
      Scene {{ current + 1 }} of {{ total }}:
      {{ plain(scenes[current]?.headline ?? '') }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.scene {
  display: flex;
  align-items: center;
  min-height: 100svh;
  padding-block: 7rem 4rem;
}

.scene__content {
  display: grid;
  gap: 1.5rem;
  max-width: 52rem;
}

.scene__meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.scene__text {
  max-width: 32rem;
  font-size: 1.125rem;
}

@media (min-width: 768px) {
  .scene--right {
    justify-content: flex-end;
  }

  .scene--right .scene__content {
    justify-items: end;
    text-align: right;
  }
}

.scene--center {
  justify-content: center;

  .scene__content {
    justify-items: center;
    text-align: center;
  }
}

// Interactive mode: scenes stack on top of each other inside one screen
.hero.is-interactive {
  position: relative;
  height: 100svh;
  overflow: hidden;

  .scene {
    position: absolute;
    inset: 0;
    min-height: 0;
    visibility: hidden;
  }
}

.hero__nav {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-bottom: 2rem;
}

.hero__dots {
  display: flex;
  gap: 0.25rem;
}

.hero__dot {
  position: relative;
  width: 28px;
  height: 28px;

  &::after {
    content: '';
    position: absolute;
    inset: 50% auto auto 50%;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid var(--foreground-muted);
    transform: translate(-50%, -50%);
    transition:
      background-color 0.3s ease,
      width 0.3s ease,
      border-color 0.3s ease;
  }

  &:hover::after {
    border-color: var(--primary);
  }

  &[aria-current='step']::after {
    width: 22px;
    border-radius: 999px;
    border-color: var(--primary);
    background: var(--primary);
  }
}

.hero__count {
  color: var(--foreground-muted);
  font-variant-numeric: tabular-nums;
}

.hero__skip {
  margin-left: auto;
  min-height: 44px;

  &:hover {
    color: var(--primary);
  }
}
</style>
