<script setup lang="ts">
// "Behind the build": the section's statement (UiStatement: a violet pill and one big serif
// statement whose words light up as it scrolls by), a "More about me" button, and a numbered
// list of what I build (UiStepList). Once the statement has gone by, the button and the list
// pin mid-screen and the scroll steps the active row down the eight rows; after the last one
// the page scrolls on (usePinnedSteps).
const { data: profile } = await useProfile()

const foot = ref<HTMLElement | null>(null)
const active = ref(0)

usePinnedSteps(
  foot,
  () => profile.value?.about.services.length ?? 1,
  (i) => (active.value = i)
)
</script>

<template>
  <section v-if="profile" class="about section container" aria-labelledby="about-title">
    <UiStatement id="about-title" :label="profile.about.label" :text="profile.about.statement" />

    <div ref="foot" class="about__foot">
      <div class="about__cta">
        <UiGlassButton to="/about">
          More about me <span class="about__cta-arrow" aria-hidden="true">↳</span>
        </UiGlassButton>
      </div>
      <UiStepList :items="profile.about.services" :active="active" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.about {
  display: grid;
  gap: clamp(4rem, 10vw, 9rem);
}

.about__foot {
  display: grid;
  gap: 3rem;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    align-items: start;
  }
}

// On phones the button follows the list
.about__cta {
  order: 2;

  @media (min-width: 1024px) {
    order: 0;
  }
}

.about__cta-arrow {
  display: inline-block;
  margin-left: 0.35em;
  transition: transform 0.4s var(--ease-out);

  :hover > & {
    transform: translate(2px, 2px);
  }
}
</style>
