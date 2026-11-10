<script setup lang="ts">
const { data: profile } = await useProfile()
</script>

<template>
  <section v-if="profile" class="cta section" aria-labelledby="cta-title">
    <UiMarquee :items="profile.contact.marquee" class="cta__marquee t-h2" :duration="40" />

    <div class="cta__body container">
      <UiSectionLabel :index="6" label="Contact" />
      <h2 id="cta-title" class="t-h2"><UiAccentText :text="profile.contact.headline" /></h2>
      <p class="cta__text">{{ profile.contact.body }}</p>
      <UiGlassButton to="/contact" variant="primary">Start a project</UiGlassButton>
    </div>
  </section>
</template>

<style scoped lang="scss">
.cta {
  display: grid;
  gap: clamp(3rem, 8vw, 6rem);
  overflow: hidden;
}

.cta__marquee {
  font-family: var(--font-display);
  text-transform: uppercase;
  line-height: 1;
  padding-block: 1rem;
  border-block: 1px solid var(--border);
}

.cta__body {
  display: grid;
  justify-items: center;
  gap: 1.5rem;
  text-align: center;
}

.cta__text {
  max-width: 34rem;
  font-size: 1.125rem;
}
</style>
