<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { createAboutScene } from '~/webgl/about/AboutScene'
import type { RoomBeatContent } from './RoomBeat.vue'

// The top of the About page: a walk through the room (webgl/about/AboutScene.ts). The room
// stays on screen while the visitor scrolls through a tall stretch: down the hallway, through
// the door, past the lounge, the bookshelf and the desk, then into the right monitor until its
// screen fills the window. The story's beats (content/about.json room, see RoomBeat) take
// turns over it, one per stretch of the walk; the last stretch is the push into the screen,
// which fades into the page, and the rest of the About page follows.
//
// The beats' frames sit on the room's screen layer, so they never scroll: each fades in, in
// place, as its stretch begins (its headline rising letter by letter from behind a mask, the
// words after an arrow sliding right the way it points, the small lines following and the
// paragraphs decoding from random characters) and fades out before the next. Scrolling back
// replays them. At the end of the walk, once the monitor fills the window, the hero's portal
// plays once and opens onto the rest of the page.
//
// The shared 3D world pauses meanwhile (one 3D scene at a time). With reduced motion, without
// WebGL, or if the room fails to load, the beats are simply shown as sections of text.
const props = defineProps<{ beats: RoomBeatContent[] }>()

const store = useAppStore()
const lenis = useLenis()

/** Scroll length of each stretch of the walk, in screen heights: longer = slower */
const STRETCH = 1.7

const root = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
/** The 3D room is running */
const enabled = ref(false)
const loaded = ref(false)
/** 0 → 1: how far the camera is inside the monitor */
const fill = ref(0)

/**
 * The room gives way to the page once the end portal covers the screen (so the portal grows
 * over the glowing monitor). Without the portal (no WebGL for it), the screen simply fades into
 * the page over the last tenth of the push.
 */
const portalReady = ref(false)
const screenOpacity = computed(() => {
  if (covered.value) return 1
  if (portalReady.value) return 0
  return Math.min(1, Math.max(0, (fill.value - 0.9) / 0.1))
})
/** One stretch per beat, plus the push into the screen */
const stretches = computed(() => props.beats.length + 1)

let room: ReturnType<typeof createAboutScene> | null = null
/** The portal at the end of the walk (utils/portalReveal.ts) */
const portal = ref<HTMLCanvasElement | null>(null)
const portalOn = ref(false)
/** The portal covers the screen: behind it the room gives way to the page */
const covered = ref(false)
const portalState: PortalRevealState = { x: 0, y: 0, radius: 0, hole: 0, glitch: 0 }
let portalReveal: ReturnType<typeof createPortalReveal> = null
const drawPortal = () => {
  if (portalOn.value) portalReveal?.draw()
}
let motion: gsap.Context | null = null
let splits: SplitText[] = []
let stopTheme: (() => void) | null = null

function supportsWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

/** Resolves once the page portal has opened (the first beat waits for it) */
function whenRevealed() {
  if (!store.revealing) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const stop = watch(
      () => store.revealing,
      (covering) => {
        if (covering) return
        stop()
        resolve()
      }
    )
  })
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * The end of the walk. Once the camera has pushed into the monitor and its screen fills the
 * window, the hero's portal plays once, like the entrance: it grows from the middle of the
 * screen with glitch flares until it covers it (the page holds still meanwhile), the room
 * behind gives way to the page, and then a hole slowly tears open onto the page that follows.
 * It sits over the whole screen, so it plays out even if the visitor keeps scrolling. Going
 * back up into the room resets it, to play again on the way down.
 */
let portalPlayed = false
let portalPlaying = false
let disposed = false

async function playPortal() {
  if (!portalReveal) return
  portalPlayed = true
  portalPlaying = true
  Object.assign(portalState, {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    radius: 0,
    hole: 0,
    glitch: 0,
  })
  portalOn.value = true
  lenis?.stop()
  await new Promise<void>((resolve) => {
    gsap
      .timeline({ onComplete: resolve })
      .to(portalState, { radius: 1.6, duration: 1.6, ease: 'power2.in' }, 0)
      .to(portalState, { glitch: 1, duration: 0.12, ease: 'none' }, 0)
      .to(portalState, { glitch: 0.12, duration: 0.6, ease: 'power2.out' }, 0.12)
      .to(portalState, { glitch: 0.9, duration: 0.08, ease: 'none' }, 1.05)
      .to(portalState, { glitch: 0, duration: 0.45, ease: 'power2.out' }, 1.13)
  })
  if (disposed) return
  // Covered: behind the portal the room gives way to the page
  covered.value = true
  await new Promise((r) => setTimeout(r, 350))
  lenis?.start()
  await openPortalHole(portalState, () => !disposed, 2)
  portalOn.value = false
  portalPlaying = false
}

/** The room's held screen is still in view (the visitor hasn't scrolled on past the walk) */
function roomInView() {
  const box = root.value?.getBoundingClientRect()
  return !!box && box.bottom > window.innerHeight * 0.6
}

function onScreenFill(f: number) {
  fill.value = f
  if (!portalPlayed && f >= 0.985) {
    // The camera eases behind the scroll: if the visitor has already scrolled past the room,
    // don't cover what they're reading now; the room has simply given way to the page
    if (roomInView()) void playPortal()
    else {
      portalPlayed = true
      covered.value = true
    }
  } else if (portalPlayed && !portalPlaying && f < 0.85) {
    portalPlayed = false
    covered.value = false
  }
}

function animate(el: HTMLElement) {
  motion = gsap.context(() => {
    const frames = [...el.querySelectorAll<HTMLElement>('.room-beat')]

    // Each beat's headline: its lines split into letters that rise from behind a mask
    const parts = frames.map((frame) => {
      for (const line of frame.querySelectorAll<HTMLElement>('.arrow-words')) {
        splits.push(
          SplitText.create(line, {
            type: 'lines,words,chars',
            mask: 'lines',
            linesClass: textClasses.line,
            wordsClass: textClasses.word,
            charsClass: textClasses.char,
            aria: 'none',
          })
        )
      }
      const headline = frame.querySelector<HTMLElement>('.room-beat__headline')!
      // The small lines follow the headline in; the paragraphs among them decode
      const small = [...frame.querySelectorAll<HTMLElement>('.room-beat__small')]
      const scrambled = [...frame.querySelectorAll<HTMLElement>('.room-beat__scramble')]
      hideText(headline)
      arrowsHide(headline)
      gsap.set(small, { autoAlpha: 0, y: 18 })
      return { headline, small, scrambled, played: null as gsap.core.Timeline | null }
    })

    const show = (i: number) => {
      const p = parts[i]
      if (!p || p.played) return
      p.played = gsap
        .timeline()
        .add(textIn(p.headline, 1, 0.9), 0)
        // The words after an arrow slide right, the way it points; the arrows come in
        .add(arrowsIn(p.headline), 0.2)
        .to(p.small, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'expo.out' }, 0.35)
        .add(decodeText(p.scrambled, { upper: true }), 0.35)
    }
    const hide = (i: number) => {
      const p = parts[i]
      if (!p?.played) return
      p.played.kill()
      p.played = null
      hideText(p.headline)
      arrowsHide(p.headline)
      decodeReset(p.scrambled)
      gsap.set(p.small, { autoAlpha: 0, y: 18 })
    }

    let active = -2
    const update = (scrolled: number) => {
      const at = scrolled / (window.innerHeight * STRETCH)
      frames.forEach((frame, i) => {
        const local = at - i
        let opacity = 0
        if (local >= 0 && local < 1) {
          // In over the first sixth of its stretch (the first beat is there from the start),
          // out over the last fifth
          opacity = (i === 0 ? 1 : smooth(0, 0.16, local)) * (1 - smooth(0.8, 0.97, local))
        }
        gsap.set(frame, { autoAlpha: opacity })
      })
      const now = Math.floor(at)
      if (now === active) return
      // Arriving at a beat plays its text; going back above a beat resets it to replay
      for (let i = now + 1; i < frames.length; i++) hide(i)
      if (now >= 0 && now < frames.length) {
        if (now === 0 && active === -2) void whenRevealed().then(() => show(0))
        else show(now)
      }
      active = now
    }

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => update(self.scroll() - self.start),
      onRefresh: (self) => update(Math.max(0, self.scroll() - self.start)),
    })
    update(Math.max(0, trigger.scroll() - trigger.start))
  }, el)
}

function stop() {
  disposed = true
  lenis?.start()
  gsap.ticker.remove(drawPortal)
  portalReveal?.dispose()
  portalReveal = null
  portalOn.value = false
  covered.value = false
  motion?.revert()
  motion = null
  splits.forEach((s) => s.revert())
  splits = []
  stopTheme?.()
  stopTheme = null
  room?.dispose()
  room = null
  store.worldPaused = false
  store.pageLoading = false
}

onMounted(async () => {
  if (prefersReducedMotion() || !supportsWebGL2()) return
  enabled.value = true
  store.worldPaused = true
  store.pageLoading = true
  await nextTick()
  if (!canvas.value || !root.value) return stop()

  room = createAboutScene(canvas.value, {
    trigger: root.value,
    theme: store.theme,
    // The camera follows the scroll softly: a slow, smooth walk
    damping: 1.6,
    onLoad: () => {
      loaded.value = true
      store.pageLoading = false
    },
    onError: (error) => {
      console.error('[about] the room failed to load', error)
      enabled.value = false
      stop()
      void nextTick(() => ScrollTrigger.refresh())
    },
    onScreenFill,
  })
  if (portal.value) {
    portalReveal = createPortalReveal(portal.value, portalState)
    gsap.ticker.add(drawPortal)
    portalReady.value = !!portalReveal
  }
  await document.fonts.ready
  if (!root.value || !enabled.value) return
  animate(root.value)
  stopTheme = watch(
    () => store.theme,
    (theme) => room?.setTheme(theme)
  )
  // The page just got taller: re-measure the triggers below and Lenis' scroll limit
  ScrollTrigger.refresh()
  lenis?.resize()
})

onBeforeUnmount(stop)
</script>

<template>
  <div
    ref="root"
    class="room"
    :class="{ 'is-3d': enabled }"
    :style="{ '--stretches': stretches, '--stretch': `${STRETCH * 100}vh` }"
  >
    <div v-if="enabled" class="room__stage">
      <canvas ref="canvas" class="room__canvas" aria-hidden="true" />
      <div class="room__scrim" :style="{ opacity: 1 - fill }" aria-hidden="true" />
      <!-- The beats take turns on the room's screen layer -->
      <AboutRoomBeat v-for="(beat, i) in beats" :key="i" :beat="beat" :first="i === 0" overlay />
      <div class="room__screen" :style="{ opacity: screenOpacity }" aria-hidden="true" />
      <!-- Plain until the room has loaded (no percentage) -->
      <div v-if="!loaded" class="room__loader" aria-hidden="true" />
    </div>

    <template v-else>
      <AboutRoomBeat v-for="(beat, i) in beats" :key="i" :beat="beat" :first="i === 0" />
    </template>

    <!-- The portal at the end of the walk (over the whole screen while it plays) -->
    <canvas v-show="portalOn" ref="portal" class="room__portal" aria-hidden="true" />
  </div>
</template>

<style scoped lang="scss">
// With the 3D room: one stretch of scrolling per beat, plus the push into the screen
.room.is-3d {
  position: relative;
  height: calc(var(--stretches) * var(--stretch));
}

// The room and its words stay on screen while the page scrolls through the stretches
.room__stage {
  position: sticky;
  top: 0;
  height: 100svh;
  overflow: hidden;
}

.room__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

// Keeps the words readable over the room: a soft wash at the edges and the foot
.room__scrim {
  --scrim: 0.38;

  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      90deg,
      rgba(var(--background-rgb), var(--scrim)) 0%,
      transparent 42%,
      transparent 58%,
      rgba(var(--background-rgb), var(--scrim)) 100%
    ),
    linear-gradient(0deg, rgba(var(--background-rgb), calc(var(--scrim) * 1.1)) 0%, transparent 45%);
}

// By day the wash is pale: keep it light, or the dark hallway turns hazy (each beat's words
// carry their own soft wash, see RoomBeat)
:global([data-theme='light'] .room__scrim) {
  --scrim: 0.2;
}

// Inside the monitor, the screen fades into the page that follows
.room__screen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: var(--page-bg, var(--background));
}

// The portal at the end of the walk, over the whole screen while it plays
.room__portal {
  position: fixed;
  inset: 0;
  z-index: 240;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.room__loader {
  position: absolute;
  inset: 0;
  background: var(--page-bg, var(--background));
}
</style>
