<script setup lang="ts">
const { data: profile } = await useProfile()
</script>

<template>
  <section v-if="profile" class="about section container" aria-labelledby="about-title">
    <div class="section__head">
      <UiSectionLabel :index="1" label="About" />
      <h2 id="about-title" class="t-h2"><UiAccentText :text="profile.about.headline" /></h2>
    </div>

    <div class="about__body">
      <div class="about__text">
        <p v-for="(p, i) in profile.about.paragraphs" :key="i">{{ p }}</p>
        <p class="about__fun t-muted">{{ profile.about.funLine }}</p>
        <NuxtLink to="/about" class="text-link">More about me</NuxtLink>
      </div>

      <ul role="list" class="about__stats">
        <li v-for="stat in profile.stats" :key="stat.label" class="about__stat">
          <span class="about__number">
            <UiCounter :value="stat.value" :prefix="stat.prefix" :suffix="stat.suffix" />
          </span>
          <span class="t-label t-muted">{{ stat.label }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped lang="scss">
.about__body {
  display: grid;
  gap: 4rem;

  @media (min-width: 1024px) {
    grid-template-columns: 1.2fr 1fr;
    gap: 6rem;
  }
}

.about__text {
  display: grid;
  gap: 1.25rem;
  align-content: start;
  max-width: 40rem;
  font-size: 1.125rem;
}

.about__fun {
  font-size: 1rem;
}

.about__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2.5rem 1.5rem;
  align-content: start;
}

.about__stat {
  display: grid;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.about__number {
  font-family: var(--font-display);
  font-size: clamp(3rem, 10vw, 5rem);
  line-height: 0.9;
}
</style>
