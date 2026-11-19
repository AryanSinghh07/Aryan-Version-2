<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createAboutScene } from '~/webgl/about/AboutScene'

// The top of the About page: a walk through the room (webgl/about/AboutScene.ts). The room
// stays on screen while the visitor scrolls through a tall stretch: down the hallway, through
// the door, past the lounge, the bookshelf and the desk, then into the right monitor until its
// screen fills the window. The story's five beats (content/about.json scenes) scroll over it,
// one per stretch; the last stretch is the push into the screen, which fades into the page,
// and the rest of the About page follows.
//
// The shared 3D world pauses meanwhile (one 3D scene at a time). With reduced motion, without
// WebGL, or if the room fails to load, the beats are simply shown as text.
const props = defineProps<{
  scenes: { label: string; headline: string; text: string }[]
}>()

const store = useAppStore()
const lenis = useLenis()

const root = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
/** The 3D room is running */
const enabled = ref(false)
const loaded = ref(false)
const progress = ref(0)
/** 0 → 1: how far the camera is inside the monitor */
const fill = ref(0)

/** The screen fades into the page over the last tenth of the push */
const screenOpacity = computed(() => Math.min(1, Math.max(0, (fill.value - 0.9) / 0.1)))
/** One stretch per beat, plus the push into the screen */
const stretches = computed(() => props.scenes.length + 1)

let room: ReturnType<typeof createAboutScene> | null = null
let fades: gsap.Context | null = null
let stopTheme: (() => void) | null = null

function supportsWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

/**
 * Each beat's words fade in as its stretch begins and out before the next beat arrives, so
 * only one is ever on screen (they hold in place meanwhile, see .room__copy)
 */
function crossfade(el: HTMLElement) {
  fades = gsap.context(() => {
    for (const beat of el.querySelectorAll<HTMLElement>('.room__beat:not(.room__beat--push)')) {
      // From the beat's top at the bottom of the screen to its bottom 60% down: 210vh of
      // scroll (one 170vh stretch and 40vh), of which the first 50vh fade in and the last
      // 40vh fade out
      gsap
        .timeline({
          scrollTrigger: { trigger: beat, start: 'top bottom', end: 'bottom 60%', scrub: 0.6 },
        })
        .fromTo(
          beat.querySelector('.room__copy'),
          { autoAlpha: 0, y: 40 },
          { autoAlpha: 1, y: 0, duration: 0.24, ease: 'none' }
        )
        .to(
          beat.querySelector('.room__copy'),
          { autoAlpha: 0, y: -40, duration: 0.19, ease: 'none' },
          0.81
        )
    }
  }, el)
}

function stop() {
  fades?.revert()
  fades = null
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
    onProgress: (p) => (progress.value = p),
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
    onScreenFill: (f) => (fill.value = f),
  })
  crossfade(root.value)
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
  <div ref="root" class="room" :class="{ 'is-3d': enabled }" :style="{ '--stretches': stretches }">
    <div v-if="enabled" class="room__stage" aria-hidden="true">
      <canvas ref="canvas" class="room__canvas" />
      <div class="room__scrim" :style="{ opacity: 1 - fill }" />
      <div class="room__screen" :style="{ opacity: screenOpacity }" />
      <div v-if="!loaded" class="room__loader t-label">{{ Math.round(progress * 100) }}%</div>
    </div>

    <div class="room__beats">
      <section
        v-for="(scene, i) in scenes"
        :key="scene.label"
        class="room__beat container"
        :aria-label="scene.label"
      >
        <div class="room__copy">
          <span class="room__label t-label">{{ scene.label }}</span>
          <component :is="i === 0 ? 'h1' : 'h2'" v-reveal class="room__headline">
            <UiAccentText :text="scene.headline" />
          </component>
          <p v-reveal class="room__text"><UiAccentText :text="scene.text" /></p>
        </div>
      </section>
      <!-- The last stretch: the push into the monitor -->
      <div v-if="enabled" class="room__beat room__beat--push" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped lang="scss">
// Without the 3D room: the beats are plain sections on the page
.room__beats {
  display: grid;
}

.room__beat {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 80svh;
  padding-block: clamp(4rem, 10vh, 8rem);
}

.room__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.25rem;
}

.room__label {
  padding: 0.45em 0.95em;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 0.8rem;
  line-height: 1.2;
}

.room__headline {
  max-width: 14ch;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(3rem, 7vw, 7rem);
  font-weight: 400;
  line-height: 0.92;
  letter-spacing: -0.02em;
  color: var(--foreground);

  :deep(em) {
    color: var(--primary);
  }
}

.room__text {
  max-width: 34rem;
  margin: 0;
  font-size: clamp(1.05rem, 1.3vw, 1.25rem);
  line-height: 1.65;
  color: color-mix(in srgb, var(--foreground) 82%, transparent);

  // Highlighted words: bold in the full text colour (not the browser's yellow <mark>)
  :deep(.keyword) {
    padding: 0;
    background: none;
    color: var(--foreground);
    font-weight: 600;
  }
}

// ---------------------------------------------------------------- With the 3D room
.room.is-3d {
  // Scroll length of each stretch of the walk: longer = slower
  --stretch: 170vh;

  position: relative;
  height: calc(var(--stretches) * var(--stretch));

  // The beats scroll over the room, one stretch each
  .room__beats {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: block;
    pointer-events: none;
  }

  .room__beat {
    display: block;
    height: var(--stretch);
    min-height: 0;
    padding-block: 0;
  }

  // Each beat's words hold in place while its stretch of the walk plays, then move on
  .room__copy {
    position: sticky;
    top: 30vh;
    pointer-events: auto;

    @media (max-width: 767px) {
      top: 16vh;
    }
  }
}

// The room stays on screen while the page scrolls through its stretches
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

// Keeps the words readable over the room: a wash from the left (from the top on phones)
.room__scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    rgba(var(--background-rgb), 0.62) 0%,
    rgba(var(--background-rgb), 0.25) 40%,
    transparent 60%
  );

  @media (max-width: 767px) {
    background: linear-gradient(
      180deg,
      rgba(var(--background-rgb), 0.72) 0%,
      rgba(var(--background-rgb), 0.45) 50%,
      transparent 78%
    );
  }
}

// Inside the monitor, the screen fades into the page that follows
.room__screen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: var(--background);
}

.room__loader {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--background);
  color: var(--foreground-muted);
  letter-spacing: 0.2em;
}
</style>
