<script setup lang="ts">
// Shown after the contact form is sent without JavaScript (Netlify redirects here)
usePageSeo({
  title: 'Message sent',
  description: 'Your message to Aryan Singh is on its way.',
  noindex: true,
})
</script>

<template>
  <div class="thanks page-top container">
    <p class="t-label thanks__label">Message sent</p>
    <h1 v-reveal class="t-hero"><UiAccentText text="Thank *you*" /></h1>
    <p class="thanks__body">Your message is on its way. I usually reply within a day or two.</p>
    <UiGlassButton to="/" variant="primary">Back to the home page</UiGlassButton>
  </div>
</template>

<style scoped lang="scss">
.thanks {
  display: grid;
  gap: 1.5rem;
  justify-items: start;
  min-height: 70svh;
  align-content: center;
}

.thanks__label {
  color: var(--success);
}

.thanks__body {
  max-width: 32rem;
  font-size: 1.125rem;
}
</style>
