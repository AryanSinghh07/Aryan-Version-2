<script setup lang="ts">
usePageSeo({
  title: 'About',
  description:
    'About Aryan Singh: BCA (AI and ML) at Galgotias University, Smart India Hackathon and IEEE Code Astraa finalist, building AI that ships.',
})

const { data: about } = await useAbout()
const { data: profile } = await useProfile()
</script>

<template>
  <div v-if="about && profile" class="about-page">
    <!-- Five full-screen story scenes, like the home hero (stacked without JS or motion) -->
    <ScenesSceneStack :scenes="about.scenes" label="About" />

    <SectionsBackground :index="1" :teaser="false" />

    <section class="section container" aria-labelledby="approach-title">
      <div class="section__head">
        <UiSectionLabel :index="2" label="Approach" />
        <h2 id="approach-title" v-reveal class="t-h2">
          <UiAccentText :text="about.approach.headline" />
        </h2>
      </div>
      <ol role="list" class="approach">
        <li v-for="(step, i) in about.approach.steps" :key="step.title" class="approach__step">
          <span class="t-label approach__index">[{{ projectNumber(i + 1) }}]</span>
          <h3 class="t-h3">{{ step.title }}</h3>
          <p class="t-muted">{{ step.text }}</p>
        </li>
      </ol>
    </section>

    <section class="section container" aria-labelledby="faq-title">
      <div class="section__head">
        <UiSectionLabel :index="3" label="FAQ" />
        <h2 id="faq-title" v-reveal class="t-h2"><UiAccentText text="Good *questions*" /></h2>
      </div>
      <div class="faq">
        <details v-for="item in about.faq" :key="item.question" class="faq__item">
          <summary class="faq__question t-h3">{{ item.question }}</summary>
          <p class="faq__answer">{{ item.answer }}</p>
        </details>
      </div>
      <p class="faq__more">
        Still curious?
        <NuxtLink to="/contact" class="text-link">Ask me directly</NuxtLink>
        or
        <a :href="profile.resume" class="text-link" download>download my resume</a>.
      </p>
    </section>
  </div>
</template>

<style scoped lang="scss">
.approach {
  display: grid;
  gap: 3rem 4rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.approach__step {
  display: grid;
  gap: 0.75rem;
  align-content: start;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.approach__index {
  color: var(--primary);
}

.faq {
  border-top: 1px solid var(--border);
}

.faq__item {
  border-bottom: 1px solid var(--border);
}

.faq__question {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-block: 1.5rem;
  cursor: pointer;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }

  &::after {
    content: '+';
    color: var(--primary);
    font-family: var(--font-mono);
  }

  [open] > &::after {
    content: '−';
  }

  &:hover {
    color: var(--primary);
  }
}

.faq__answer {
  max-width: 44rem;
  padding-bottom: 1.5rem;
  color: var(--foreground-muted);
}

.faq__more {
  margin-top: 3rem;
}
</style>
