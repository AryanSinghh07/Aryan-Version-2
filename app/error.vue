<script setup lang="ts">
import type { NuxtError } from '#app'

// Branded error page (404 and anything else that goes wrong), with the normal header and footer.
const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)

useHead({
  title: notFound.value ? 'Page not found' : 'Something went wrong',
  titleTemplate: (title) => (title ? `${title} — Aryan Singh` : 'Aryan Singh'),
})
useSeoMeta({ robots: 'noindex' })

const home = () => clearError({ redirect: '/' })
const work = () => clearError({ redirect: '/work' })
</script>

<template>
  <a href="#main" class="skip-link t-label">Skip to content</a>
  <LayoutHeader />
  <main id="main" tabindex="-1" class="error page-top container">
    <p class="t-label t-muted">[{{ error.statusCode }}]</p>
    <h1 class="t-hero">
      <template v-if="notFound">Lost in <em>space</em></template>
      <template v-else>Something <em>broke</em></template>
    </h1>
    <p class="error__text">
      {{
        notFound
          ? "This page doesn't exist, or it moved. Try the home page or my work."
          : 'An unexpected error happened. Please try again in a moment.'
      }}
    </p>
    <div class="error__actions">
      <UiGlassButton variant="primary" @click="home">Go home</UiGlassButton>
      <UiGlassButton @click="work">See my work</UiGlassButton>
    </div>
  </main>
  <LayoutFooter />
</template>

<style scoped lang="scss">
.error {
  display: grid;
  gap: 1.5rem;
  align-content: center;
  justify-items: start;
  min-height: 80svh;
  padding-bottom: 5rem;
}

.error__text {
  max-width: 32rem;
  font-size: 1.125rem;
}

.error__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
