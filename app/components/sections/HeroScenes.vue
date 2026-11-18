<script setup lang="ts">
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// The home hero: five full-screen scenes from content/profile.json, then a scroll-driven
// outro. Past the last scene the hero stays pinned while the visitor scrolls through a tall
// stretch; that scroll (store.outro, 0 → 1) drives the 3D world: the ring grows and rushes at
// the camera, a portal opens behind it and swallows the screen, the landscape ends, and the
// page carries on below. Scrolling back up plays it in reverse.
//
// Without JavaScript or with reduced motion there is no outro: the scenes simply stack.
const { data: profile } = await useProfile()
const store = useAppStore()
const lenis = useLenis()
const intro = computed(() => (profile.value ? `${profile.value.intro} ${profile.value.role}` : ''))

const wrap = ref<HTMLElement | null>(null)
const enabled = ref(false)
let trigger: ScrollTrigger | null = null

onMounted(async () => {
  if (prefersReducedMotion()) return
  enabled.value = true
  store.outro = 0
  await nextTick()
  if (!wrap.value) return
  trigger = ScrollTrigger.create({
    trigger: wrap.value,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      store.outro = self.progress
      wrap.value?.style.setProperty('--outro', self.progress.toFixed(4))
    },
  })
  // The page just got taller: Lenis' scroll limit and every trigger below must be re-measured
  // (a stale limit would stop the page short of its end)
  lenis?.resize()
  ScrollTrigger.refresh()
})

onBeforeUnmount(() => {
  trigger?.kill()
  store.outro = null
})
</script>

<template>
  <div ref="wrap" class="hero-outro" :class="{ 'has-outro': enabled }">
    <ScenesSceneStack
      v-if="profile"
      :scenes="profile.heroScenes"
      :intro="intro"
      label="Hero"
      :release-distance="enabled ? 0.45 : undefined"
    />
  </div>
</template>

<style scoped lang="scss">
// The hero screen plus the stretch the outro plays over
.hero-outro.has-outro {
  height: calc(100svh + 260vh);

  // The hero stays on screen while the outro plays
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
