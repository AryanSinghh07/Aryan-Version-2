<script setup lang="ts">
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// The home hero: five full-screen scenes from content/profile.json, then a scroll-driven
// outro. It is a normal scroll: the hero stays on screen while the visitor scrolls through a
// tall stretch. The first part moves through the scenes (store.sceneProgress, 0 → 4): the
// particles morph from one shape into the next and the camera travels with the scroll, so
// stopping mid-way leaves the shape mid-morph; each scene's words change half-way. The last
// part is the outro (store.outro, 0 → 1): the ring grows and rushes at the camera, a portal
// opens behind it and swallows the screen, the landscape ends, and the page carries on below.
// Scrolling back up plays it all in reverse.
//
// Without JavaScript or with reduced motion there is no scroll stretch: the scenes simply stack.
const { data: profile } = await useProfile()
const store = useAppStore()
const lenis = useLenis()
const intro = computed(() => (profile.value ? `${profile.value.intro} ${profile.value.role}` : ''))

/** Scroll per scene change, and for the outro, in screen heights */
const SCENE_STEP = 1.1
const OUTRO = 2.6

const count = computed(() => profile.value?.heroScenes.length ?? 1)
const scenesLength = computed(() => (count.value - 1) * SCENE_STEP)

const wrap = ref<HTMLElement | null>(null)
const enabled = ref(false)
let trigger: ScrollTrigger | null = null

onMounted(async () => {
  if (prefersReducedMotion()) return
  enabled.value = true
  store.outro = 0
  store.sceneProgress = 0
  await nextTick()
  if (!wrap.value) return
  trigger = ScrollTrigger.create({
    trigger: wrap.value,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const vh = window.innerHeight
      const scrolled = self.scroll() - self.start
      const scenes = scenesLength.value * vh
      const progress = Math.min(Math.max(scrolled / scenes, 0), 1) * (count.value - 1)
      store.sceneProgress = progress
      const scene = Math.round(progress)
      if (scene !== store.scene) store.setScene(scene)
      const outro = Math.min(Math.max((scrolled - scenes) / (OUTRO * vh), 0), 1)
      store.outro = outro
      wrap.value?.style.setProperty('--outro', outro.toFixed(4))
    },
  })
  // The page just got taller: Lenis' scroll limit and every trigger below must be re-measured
  // (a stale limit would stop the page short of its end)
  lenis?.resize()
  ScrollTrigger.refresh()
  trigger.update()
})

onBeforeUnmount(() => {
  trigger?.kill()
  store.outro = null
  store.sceneProgress = 0
})
</script>

<template>
  <div
    ref="wrap"
    class="hero-outro"
    :class="{ 'has-outro': enabled }"
    :style="{ '--scenes': scenesLength, '--outro-length': OUTRO }"
  >
    <ScenesSceneStack v-if="profile" :scenes="profile.heroScenes" :intro="intro" label="Hero" />
  </div>
</template>

<style scoped lang="scss">
// The hero screen plus the stretch the scenes and the outro play over
.hero-outro.has-outro {
  height: calc(100svh + (var(--scenes) + var(--outro-length)) * 100vh);

  // The hero stays on screen meanwhile
  :deep(.hero.is-interactive) {
    position: sticky;
    top: 0;
  }

  // The words and scrim fade away as the ring starts to grow (a filter, because the
  // scene motion writes its own inline opacity on these elements)
  :deep(.scene__content),
  :deep(.hero__scrim) {
    filter: opacity(clamp(0, calc(1 - var(--outro, 0) * 3.5), 1));
  }
}
</style>
