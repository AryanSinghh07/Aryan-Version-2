<script setup lang="ts">
useHead({
  titleTemplate: (title) =>
    title ? `${title} — Aryan Singh` : 'Aryan Singh — Full Stack Developer and AI/ML Engineer',
})
</script>

<template>
  <a href="#main" class="skip-link t-label">Skip to content</a>
  <LayoutHeader />
  <main id="main" tabindex="-1">
    <NuxtPage />
  </main>
  <LayoutFooter />
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
