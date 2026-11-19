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
    <!-- A walk through the room, the story's five beats over it, into the monitor -->
    <AboutRoomStory :beats="about.room" />

    <!-- How it began, with "Since 2023" growing into the year zoom after it -->
    <AboutYear :year="about.year">
      <AboutStory :story="about.story" />
    </AboutYear>

    <section class="section container" aria-labelledby="approach-title">
      <div class="section__head">
        <UiSectionLabel :index="2" label="Approach" />
        <h2 id="approach-title" v-reveal class="t-h2">
          <UiAccentText :text="about.approach.headline" />
        </h2>
        <p v-if="about.approach.intro" v-reveal class="approach__intro">
          {{ about.approach.intro }}
        </p>
      </div>
      <!-- A ruled index: the step and its number, what it is, then what happens and the tools -->
      <ol role="list" class="approach">
        <li v-for="(step, i) in about.approach.steps" :key="step.title" class="approach__step">
          <span class="t-label approach__index">({{ String(i + 1).padStart(2, '0') }})</span>
          <div class="approach__main">
            <h3 v-reveal class="approach__title text-glitch">{{ step.title }}</h3>
            <p v-reveal class="approach__text">{{ step.text }}</p>
          </div>
          <div class="approach__more">
            <ul v-if="step.details?.length" role="list" class="approach__details">
              <li v-for="d in step.details" :key="d">{{ d }}</li>
            </ul>
            <p v-if="step.tools" class="approach__tools t-label">
              <span class="approach__tools-label">Tools</span> {{ step.tools }}
            </p>
          </div>
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
// The About page sits on the same plain near-black as the home page past its portal (the
// room fades into it, see RoomStory); by day, the page colour
.about-page {
  --page-bg: var(--background);

  background-color: var(--page-bg);
}

:global([data-theme='dark'] .about-page) {
  --page-bg: #121212;
}

.approach__intro {
  max-width: 34rem;
  margin: 0;
  font-size: clamp(1rem, 1.2vw, 1.15rem);
  line-height: 1.6;
  color: color-mix(in srgb, var(--foreground) 70%, transparent);
}

.approach {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
  border-bottom: 1px solid var(--border);
}

.approach__step {
  display: grid;
  gap: 1.25rem;
  padding-block: clamp(1.75rem, 3.5vw, 2.75rem);
  border-top: 1px solid var(--border);

  @media (min-width: 900px) {
    grid-template-columns: 6rem minmax(0, 1.25fr) minmax(0, 1fr);
    gap: 2.5rem;
  }
}

.approach__index {
  color: var(--primary);
  font-variant-numeric: tabular-nums;
}

.approach__main {
  display: grid;
  gap: 0.75rem;
  align-content: start;
}

.approach__title {
  margin: 0;
  font-size: clamp(1.5rem, 2.4vw, 2.4rem);
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.approach__text {
  max-width: 34rem;
  margin: 0;
  line-height: 1.65;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
}

.approach__more {
  display: grid;
  gap: 1rem;
  align-content: start;
}

// What happens in the step: short lines, each led by a small violet arrow
.approach__details {
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    position: relative;
    padding-left: 1.4em;
    line-height: 1.5;
    color: color-mix(in srgb, var(--foreground) 85%, transparent);

    &::before {
      content: '↳';
      position: absolute;
      left: 0;
      color: var(--primary);
    }
  }
}

.approach__tools {
  margin: 0;
  color: var(--foreground-muted);
}

.approach__tools-label {
  margin-right: 0.6em;
  padding: 0.3em 0.7em;
  border: 1px solid color-mix(in srgb, var(--primary) 55%, transparent);
  border-radius: 999px;
  color: var(--foreground);
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
