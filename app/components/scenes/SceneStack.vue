<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { SplitText } from 'gsap/SplitText'

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
const metas = (el?: HTMLElement) =>
  el ? [...el.querySelectorAll<HTMLElement>('.scene__meta, .scene__intro')] : []
// The tag and the [02/05] counter, which decode from random characters
const labels = (el?: HTMLElement) =>
  el ? [...el.querySelectorAll<HTMLElement>('.scene__meta .tag, .scene__meta .t-muted')] : []

// One timeline per scene change. The outgoing text folds away letter by letter while the
// incoming headline flips up out of its masks (the accent word springs in after it, then the
// paragraph rises word by word and the keyword underlines draw). The timeline only covers the
// hand-over, about 0.9 s, so the next scroll is never held up by the finishing touches.
function transition(from: number, to: number, direction: 1 | -1) {
  const outgoing = sceneEls.value[from]
  const incoming = sceneEls.value[to]
  if (!outgoing || !incoming) return null
  const outMeta = metas(outgoing)

  return gsap
    .timeline()
    .add(textOut(outgoing, direction), 0)
    .to(outMeta, { autoAlpha: 0, y: -16 * direction, duration: 0.35, ease: 'power2.in' }, 0)
    .set(incoming, { autoAlpha: 1 }, 0.4)
    .call(
      () => {
        textIn(incoming, direction, 1.25)
        scrambleIn(labels(incoming), 0.1)
      },
      [],
      0.4
    )
    .fromTo(
      metas(incoming),
      { autoAlpha: 0, y: 16 * direction },
      { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' },
      0.5
    )
    .set(outgoing, { autoAlpha: 0 }, 0.9)
    .call(() => resetText(outgoing), [], 0.9)
    .set(outMeta, { clearProps: 'transform,opacity,visibility' }, 0.9)
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
  // A slower, grander version of the scene entrance for the first impression
  introTimeline = gsap
    .timeline()
    .add(textIn(first, 1, 0.85), 0)
    .fromTo(metas(first), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.3)
    .add(scrambleIn(labels(first)), 0.35)
    .fromTo(nav(), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 0.6)
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
    if (sceneEls.value[0]) resetText(sceneEls.value[0])
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

  // Headlines into lines, words and letters; paragraphs into lines and words (textMotion.ts)
  splits = sceneEls.value.flatMap((el) =>
    [...el.querySelectorAll('.scene__split')].map((part) => splitText(part))
  )

  // Only the first scene is visible; its text waits below the masks for the intro
  gsap.set(sceneEls.value, { autoAlpha: 0 })
  gsap.set(sceneEls.value[0] ?? [], { autoAlpha: 1 })
  if (sceneEls.value[0]) hideText(sceneEls.value[0])
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
    <!-- A soft scrim on the text's side keeps the words readable over the 3D world -->
    <div
      v-if="interactive"
      class="hero__scrim"
      :data-side="scenes[current]?.side ?? 'left'"
      aria-hidden="true"
    >
      <span class="hero__scrim-layer hero__scrim-layer--left" />
      <span class="hero__scrim-layer hero__scrim-layer--right" />
      <span class="hero__scrim-layer hero__scrim-layer--center" />
    </div>
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

        <p class="scene__text scene__split"><UiAccentText :text="scene.text" /></p>

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
// Per theme: the scrim behind the text, the shadow that lifts the words off the 3D world and
// one solid accent colour for the italic word and the keywords: a rich violet that glows on the
// night sky, a deep violet that sits firmly on the pastel day. Set on the theme attribute
// itself (a scoped `.hero` default would always win over it).
:global([data-theme='dark']) {
  --scene-scrim: rgb(13 10 36 / 0.5);
  --scene-shadow: rgb(8 6 24 / 0.75);
  --scene-accent: #b08cff;
}

:global([data-theme='light']) {
  --scene-scrim: rgb(255 246 252 / 0.78);
  --scene-shadow: rgb(255 250 253 / 0.9);
  --scene-accent: #4b1fb8;
}

.hero__scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero__scrim-layer {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 1.2s var(--ease-out);
}

.hero__scrim-layer--left {
  background: linear-gradient(90deg, var(--scene-scrim) 10%, transparent 62%);
}

.hero__scrim-layer--right {
  background: linear-gradient(270deg, var(--scene-scrim) 10%, transparent 62%);
}

.hero__scrim-layer--center {
  background: radial-gradient(ellipse 60% 48% at 50% 52%, var(--scene-scrim), transparent);
}

.hero__scrim[data-side='left'] .hero__scrim-layer--left,
.hero__scrim[data-side='right'] .hero__scrim-layer--right,
.hero__scrim[data-side='center'] .hero__scrim-layer--center {
  opacity: 1;
}

// Phones: the text sits low and left-aligned, so the scrim rises from the bottom instead
@media (max-width: 767px) {
  .hero__scrim-layer--left,
  .hero__scrim-layer--right,
  .hero__scrim-layer--center {
    background: linear-gradient(0deg, var(--scene-scrim), transparent 65%);
  }
}

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

// Headlines: a soft shadow lifts them off the landscape; the italic accent word in the
// theme's accent colour
.scene :is(h1, h2) {
  text-shadow: 0 2px 28px var(--scene-shadow);

  :deep(em) {
    color: var(--scene-accent);
  }
}

.scene__text {
  max-width: 34rem;
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.55;
  letter-spacing: -0.005em;
  text-shadow: 0 1px 14px var(--scene-shadow);

  // Keywords: the accent colour, bolder, with a fine underline in the same colour that draws
  // in from the left once the sentence has landed (--kw-line, animated in textMotion.ts)
  :deep(.keyword) {
    padding-bottom: 0.12em;
    color: var(--scene-accent);
    font-weight: 650;
    background: linear-gradient(
        color-mix(in srgb, var(--scene-accent) 50%, transparent),
        color-mix(in srgb, var(--scene-accent) 50%, transparent)
      )
      no-repeat left bottom / var(--kw-line, 100%) 0.08em;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
}

// The small label and counter above the headline: a little stronger over the 3D world
.scene__meta :deep(.t-muted) {
  color: var(--foreground);
  opacity: 0.75;
}

.scene__intro {
  text-shadow: 0 1px 10px var(--scene-shadow);
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
