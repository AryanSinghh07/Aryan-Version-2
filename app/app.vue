<script setup lang="ts">
useHead({
  titleTemplate: (title) =>
    title ? `${title} — Aryan Singh` : 'Aryan Singh — Full Stack Developer and AI/ML Engineer',
})

const store = useAppStore()

// While the preloader or entry gate covers the screen, the page behind can't be focused.
// Only applied in the browser, so the server HTML is never inert.
const mounted = ref(false)
onMounted(() => (mounted.value = true))
const covered = computed(() => mounted.value && !store.entered)
</script>

<template>
  <a href="#main" class="skip-link t-label">Skip to content</a>
  <LayoutHeader :inert="covered || undefined" />
  <main id="main" tabindex="-1" :inert="covered || undefined">
    <NuxtPage />
  </main>
  <LayoutFooter :inert="covered || undefined" />
  <LayoutEntryGate />
  <LayoutPreloader />
</template>

<style lang="scss">
.skip-link {
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 200;
  padding: 0.75em 1.25em;
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  transform: translateY(-200%);

  &:focus-visible {
    transform: none;
  }
}

#main:focus {
  outline: none;
}
</style>
