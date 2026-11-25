<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { SplitText } from 'gsap/SplitText'

import type { TextSide } from '~/webgl/config/scenes'

export interface SceneContent {
  label: string
  /** Bottom layout: a large italic lead before the headline ("Got an idea?") */
  lead?: string
  headline: string
  text: string
  /** Defaults: left, constellation */
  side?: TextSide
  particleShape?: string
}

// Full-screen scenes (the home hero) that follow the page scroll: HeroScenes keeps the hero on
// screen while the visitor scrolls and sets store.scene to the nearest scene, so the words
// change half-way between two scenes (the particles morph with the scroll meanwhile).
// Without JavaScript, or with reduced motion, the scenes stay stacked and scroll like a page.
const props = defineProps<{
  scenes: SceneContent[]
  /** Small line under the first scene */
  intro?: string
  /** Names the scene set for screen readers ("Hero", "About") */
  label: string
}>()
const store = useAppStore()
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
const plain = (text: string) => text.replace(/\*/g, '').replace(/==/g, '')
/** The full headline as read aloud: the lead and the headline together */
const spoken = (scene: SceneContent) =>
  plain([scene.lead, scene.headline].filter(Boolean).join(' '))

const root = ref<HTMLElement | null>(null)
// Scene elements in DOM order (read from the DOM: a v-for ref array has no guaranteed order)
const sceneEls = shallowRef<HTMLElement[]>([])
const interactive = ref(false)
let splits: SplitText[] = []
let introTimeline: gsap.core.Timeline | null = null
let disposed = false
let stopEnteredWatch: (() => void) | undefined

const metas = (el?: HTMLElement) =>
  el ? [...el.querySelectorAll<HTMLElement>('.scene__meta, .scene__intro')] : []
// The scene tag, which decodes from random characters
const labels = (el?: HTMLElement) =>
  el ? [...el.querySelectorAll<HTMLElement>('.scene__meta .tag')] : []

// The hand-over between scenes is tied to the scroll, not the clock: one timeline for the
// whole hero, one unit per step between two scenes, whose progress is the hero's scroll
// position. Within a step the outgoing text folds away (letters tip over and out, words sink,
// underlines retract), the scenes swap half-way, and the incoming headline flips up out of
// its masks with the accent word springing in after it and the paragraph rising word by word.
// Stop scrolling anywhere and the words stop exactly there; scroll back and they play backwards.
// Every tween states both ends (fromTo, nothing applied until reached), so jumping to any point
// gives the same picture.
const OUT_AT = 0.3
const IN_AT = 0.52
const SWAP_AT = 0.5

function scrubIn(el: HTMLElement) {
  const { plain, accent } = textLetters(el)
  const words = textWords(el)
  const kws = textKeywords(el)
  const tl = gsap.timeline()
  const vars = { immediateRender: false }
  if (plain.length)
    tl.fromTo(
      plain,
      {
        yPercent: 110,
        rotateX: -85,
        autoAlpha: 0,
        transformPerspective: 600,
        transformOrigin: '50% 100% -0.2em',
      },
      {
        yPercent: 0,
        rotateX: 0,
        autoAlpha: 1,
        duration: 0.12,
        stagger: { amount: 0.06 },
        ease: 'power3.out',
        ...vars,
      },
      0
    )
  if (accent.length)
    tl.fromTo(
      accent,
      { yPercent: 110, rotate: -10, scale: 1.15, autoAlpha: 0 },
      {
        yPercent: 0,
        rotate: 0,
        scale: 1,
        autoAlpha: 1,
        duration: 0.12,
        stagger: { amount: 0.03 },
        ease: 'back.out(1.7)',
        ...vars,
      },
      0.04
    )
  if (words.length)
    tl.fromTo(
      words,
      { yPercent: 105, autoAlpha: 0 },
      {
        yPercent: 0,
        autoAlpha: 1,
        duration: 0.1,
        stagger: { amount: 0.05 },
        ease: 'power3.out',
        ...vars,
      },
      0.06
    )
  if (kws.length)
    tl.fromTo(kws, { '--kw-line': '0%' }, { '--kw-line': '100%', duration: 0.07, ...vars }, 0.16)
  const meta = metas(el)
  if (meta.length)
    tl.fromTo(
      meta,
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.1, ease: 'power3.out', ...vars },
      0.02
    )
  return tl
}

function scrubOut(el: HTMLElement) {
  const { plain, accent } = textLetters(el)
  const chars = [...plain, ...accent]
  const words = textWords(el)
  const kws = textKeywords(el)
  const tl = gsap.timeline()
  const vars = { immediateRender: false }
  if (chars.length)
    tl.fromTo(
      chars,
      { yPercent: 0, rotateX: 0, rotate: 0, scale: 1, autoAlpha: 1, transformPerspective: 600 },
      {
        yPercent: -105,
        rotateX: 80,
        autoAlpha: 0,
        duration: 0.1,
        stagger: { amount: 0.06 },
        ease: 'power3.in',
        ...vars,
      },
      0
    )
  if (words.length)
    tl.fromTo(
      words,
      { yPercent: 0, autoAlpha: 1 },
      {
        yPercent: -80,
        autoAlpha: 0,
        duration: 0.08,
        stagger: { amount: 0.04 },
        ease: 'power2.in',
        ...vars,
      },
      0
    )
  if (kws.length)
    tl.fromTo(kws, { '--kw-line': '100%' }, { '--kw-line': '0%', duration: 0.06, ...vars }, 0)
  const meta = metas(el)
  if (meta.length)
    tl.fromTo(
      meta,
      { autoAlpha: 1, y: 0 },
      { autoAlpha: 0, y: -16, duration: 0.1, ease: 'power2.in', ...vars },
      0
    )
  return tl
}

/** The whole hero's scene hand-overs, scrubbed by the scroll (see above) */
function buildScrub() {
  const els = sceneEls.value
  const tl = gsap.timeline({ paused: true })
  for (let i = 0; i < els.length - 1; i++) {
    const outgoing = els[i]!
    const incoming = els[i + 1]!
    tl.add(scrubOut(outgoing), i + OUT_AT)
    tl.set(outgoing, { autoAlpha: 0 }, i + SWAP_AT)
    tl.set(incoming, { autoAlpha: 1 }, i + SWAP_AT)
    tl.add(scrubIn(incoming), i + IN_AT)
  }
  // Exactly one unit per step, whatever the last tween's length
  tl.set({}, {}, Math.max(els.length - 1, 0))
  return tl
}

/** The scrim behind the words: each side's layer fades with the scroll as the scenes swap */
function updateScrim(progress: number) {
  const layers = root.value?.querySelectorAll<HTMLElement>('.hero__scrim-layer')
  if (!layers?.length) return
  const last = scenes.value.length - 1
  const step = Math.min(Math.floor(progress), Math.max(last - 1, 0))
  const f = Math.min(Math.max(progress - step, 0), 1)
  const t = f <= 0.4 ? 0 : f >= 0.6 ? 1 : (f - 0.4) / 0.2
  const from = scenes.value[step]?.side
  const to = scenes.value[Math.min(step + 1, last)]?.side
  for (const layer of layers) {
    const side = layer.dataset.side
    const o = (side === from ? 1 - t : 0) + (side === to ? t : 0)
    layer.style.opacity = String(Math.min(o, 1))
  }
}

// The scene that is showing (for screen readers and the active class)
const current = ref(0)
store.setScene(0)
let scrub: gsap.core.Timeline | null = null
const stopSceneWatch = watch(
  () => store.scene,
  (to) => (current.value = to)
)
const stopProgressWatch = watch(
  () => store.sceneProgress,
  (progress) => {
    if (!scrub) return
    scrub.progress(total.value > 1 ? progress / (total.value - 1) : 0)
    updateScrim(progress)
  }
)

function playIntro() {
  const first = sceneEls.value[0]
  if (!first) return
  // A slower, grander version of the scene entrance for the first impression
  introTimeline = gsap
    .timeline()
    .add(textIn(first, 1, 0.85), 0)
    .fromTo(metas(first), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.3)
    .add(scrambleIn(labels(first)), 0.35)
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
  // Landing part-way down (browser reload, or Back to a saved spot): show that point of the
  // hand-overs straight away
  const landing = store.sceneProgress > 0.01 || landsBelowHero()
  if (landing && sceneEls.value[0]) {
    resetText(sceneEls.value[0])
    gsap.set(metas(sceneEls.value[0]), { autoAlpha: 1 })
  } else {
    playIntro()
  }
  scrub = buildScrub()
  scrub.progress(total.value > 1 ? store.sceneProgress / (total.value - 1) : 0)
  updateScrim(store.sceneProgress)
}

// The text re-splits into new letters when the window width changes (SplitText's autoSplit):
// the hand-overs must then be rebuilt on the new letters, or they would animate letters that
// are gone. Every scene goes back to its waiting state, the first one shown, and the rebuilt
// hand-overs jump to the current scroll position.
let rebuildFrame = 0
function rebuildScrub() {
  if (!scrub || disposed) return
  cancelAnimationFrame(rebuildFrame)
  rebuildFrame = requestAnimationFrame(() => {
    if (!scrub || disposed) return
    scrub.kill()
    introTimeline?.kill()
    sceneEls.value.forEach((el, i) => {
      gsap.set(el, { autoAlpha: i === 0 ? 1 : 0 })
      hideText(el)
      gsap.set(metas(el), { autoAlpha: 0 })
    })
    const first = sceneEls.value[0]
    if (first) {
      resetText(first)
      gsap.set(metas(first), { autoAlpha: 1, y: 0 })
    }
    scrub = buildScrub()
    scrub.progress(total.value > 1 ? store.sceneProgress / (total.value - 1) : 0)
  })
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
  // (each later re-split, on a width change, rebuilds the hand-overs)
  splits = sceneEls.value.flatMap((el) =>
    [...el.querySelectorAll('.scene__split')].map((part) => {
      let first = true
      return splitText(part, () => {
        if (!first) rebuildScrub()
        first = false
        return gsap.timeline()
      })
    })
  )

  // Only the first scene is visible; its text waits below the masks for the intro, and every
  // other scene's text waits below its masks for its hand-over
  gsap.set(sceneEls.value, { autoAlpha: 0 })
  gsap.set(sceneEls.value[0] ?? [], { autoAlpha: 1 })
  sceneEls.value.forEach((el) => {
    hideText(el)
    gsap.set(metas(el), { autoAlpha: 0 })
  })

  // (after the entry gate, and after the page portal has opened when arriving through it)
  const ready = () => store.entered && !store.revealing
  if (ready()) begin()
  else {
    stopEnteredWatch = watch(ready, (entered) => {
      if (!entered) return
      stopEnteredWatch?.()
      begin()
    })
  }
})

onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(rebuildFrame)
  stopEnteredWatch?.()
  stopSceneWatch()
  stopProgressWatch()
  scrub?.kill()
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
      <span class="hero__scrim-layer hero__scrim-layer--left" data-side="left" />
      <span class="hero__scrim-layer hero__scrim-layer--right" data-side="right" />
      <span class="hero__scrim-layer hero__scrim-layer--center" data-side="center" />
      <span class="hero__scrim-layer hero__scrim-layer--bottom" data-side="bottom" />
    </div>
    <section
      v-for="(scene, i) in scenes"
      :key="scene.label"
      class="scene container"
      :class="[`scene--${scene.side}`, { 'is-active': interactive && current === i }]"
      :aria-label="`Scene ${i + 1} of ${total}`"
      :aria-hidden="interactive && current !== i ? 'true' : undefined"
    >
      <!-- Bottom layout: label and line top-left; the lead and a huge headline along the foot -->
      <div v-if="scene.side === 'bottom'" class="scene__content scene__content--bottom">
        <div class="scene__top">
          <div class="scene__meta">
            <UiTag :variant="i === total - 1 ? 'accent' : 'outline'">{{ scene.label }}</UiTag>
          </div>
          <p class="scene__text scene__split"><UiAccentText :text="scene.text" /></p>
        </div>
        <h2 class="scene__big">
          <span v-if="scene.lead" class="scene__lead">
            <span class="scene__split">{{ scene.lead }}</span>
            <span class="scene__arrow" aria-hidden="true">↳</span>
          </span>
          <span class="scene__main scene__split"><UiAccentText :text="scene.headline" /></span>
        </h2>
      </div>

      <div v-else class="scene__content">
        <div class="scene__meta">
          <UiTag :variant="i === total - 1 ? 'accent' : 'outline'">{{ scene.label }}</UiTag>
        </div>

        <h1 v-if="i === 0" class="t-hero scene__split">
          <UiAccentText :text="scene.headline" />
        </h1>
        <h2 v-else class="t-h2 scene__split"><UiAccentText :text="scene.headline" /></h2>

        <p class="scene__text scene__split"><UiAccentText :text="scene.text" /></p>

        <p v-if="i === 0 && intro" class="scene__intro t-label t-muted">{{ intro }}</p>
      </div>
    </section>

    <p v-if="interactive" class="sr-only" aria-live="polite">
      Scene {{ current + 1 }} of {{ total }}:
      {{ spoken(scenes[current] ?? { label: '', headline: '', text: '' }) }}
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

.hero__scrim-layer--bottom {
  background: linear-gradient(0deg, var(--scene-scrim) 5%, transparent 58%);
}

.hero__scrim[data-side='left'] .hero__scrim-layer--left,
.hero__scrim[data-side='right'] .hero__scrim-layer--right,
.hero__scrim[data-side='center'] .hero__scrim-layer--center,
.hero__scrim[data-side='bottom'] .hero__scrim-layer--bottom {
  opacity: 1;
}

// Phones: the text sits low and left-aligned, so the scrim rises from the bottom instead
@media (max-width: 767px) {
  .hero__scrim-layer--left,
  .hero__scrim-layer--right,
  .hero__scrim-layer--center,
  .hero__scrim-layer--bottom {
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

// ---------------------------------------------------------------- Bottom layout
// The shape floats in the sky; the words sit along the foot of the screen: the label and a
// small uppercase line top-left, then the italic lead with its arrow and a huge headline.
.scene--bottom {
  align-items: flex-end;
  padding-bottom: clamp(4.5rem, 9vh, 6.5rem);
}

.scene__content--bottom {
  width: 100%;
  max-width: none;
  gap: clamp(1.5rem, 4vh, 3rem);
}

.scene__top {
  display: grid;
  gap: 1.25rem;
  max-width: 26rem;
}

.scene--bottom .scene__text {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.scene__big {
  display: grid;
  gap: 0.5rem 2rem;
  font-family: var(--font-display);
  font-weight: 400;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 0.38fr) minmax(0, 1fr);
    align-items: start;
  }
}

.scene__lead {
  display: flex;
  align-items: baseline;
  gap: 0.35em;
  font-size: clamp(3.2rem, 7vw, 7rem);
  font-style: italic;
  line-height: 0.9;
}

.scene__arrow {
  font-size: 0.45em;
  font-style: normal;
  color: var(--scene-accent);
}

.scene__main {
  font-size: clamp(3.8rem, 10vw, 10.5rem);
  line-height: 0.84;
  letter-spacing: -0.01em;
  text-transform: uppercase;
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
</style>
