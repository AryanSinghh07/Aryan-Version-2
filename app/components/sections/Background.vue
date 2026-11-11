<script setup lang="ts">
// Education and certifications. On the home page it is a teaser linking to /about.
withDefaults(defineProps<{ index?: number; teaser?: boolean }>(), { index: 5, teaser: true })

const { data: education } = await useEducation()
</script>

<template>
  <section v-if="education" class="background section container" aria-labelledby="background-title">
    <div class="section__head">
      <UiSectionLabel :index="index" label="Background" />
      <h2 id="background-title" v-reveal class="t-h2"><UiAccentText text="Always *learning*" /></h2>
    </div>

    <div class="background__grid">
      <div>
        <h3 class="t-label t-muted background__heading">Education</h3>
        <ul role="list" class="background__list">
          <li v-for="e in education.education" :key="e.item" class="background__item">
            <p class="t-label t-muted">{{ e.years }}</p>
            <p class="t-h3">{{ e.item }}</p>
            <p>{{ e.institution }}</p>
            <p class="t-muted">{{ e.note }}</p>
          </li>
        </ul>
      </div>

      <div>
        <h3 class="t-label t-muted background__heading">Certifications</h3>
        <ul role="list" class="background__list">
          <li v-for="c in education.certifications" :key="c.title" class="background__cert">
            <span>{{ c.title }}</span>
            <span class="t-label t-muted">{{ c.issuer }}</span>
          </li>
        </ul>
      </div>
    </div>

    <NuxtLink v-if="teaser" to="/about" class="background__more text-link">Read my story</NuxtLink>
  </section>
</template>

<style scoped lang="scss">
.background__grid {
  display: grid;
  gap: 3rem 4rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.background__heading {
  margin-bottom: 1rem;
}

.background__list {
  border-top: 1px solid var(--border);
}

.background__item {
  display: grid;
  gap: 0.35rem;
  padding-block: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.background__cert {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.25rem 1rem;
  padding-block: 1rem;
  border-bottom: 1px solid var(--border);
}

.background__more {
  display: inline-block;
  margin-top: 3rem;
}
</style>
