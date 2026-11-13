<script setup lang="ts">
// Home projects section: a heading in four placed pieces (an italic middle word and a small
// arrow marquee) with a justified mono subtitle, then all projects as a staggered grid of
// large and small cards on 12 columns.
const { data: profile } = await useProfile()
const { data: projects } = await useProjects()

const total = computed(() => projectNumber(projects.value?.length ?? 0))

/** Rhythm for the cards, in rows: large, small, large / small, large / large, small */
const SIZES = ['large', 'small', 'large', 'small', 'large', 'large', 'small'] as const
const sizeFor = (i: number) => SIZES[i % SIZES.length]!
</script>

<template>
  <section class="showcase section container" aria-labelledby="work-title">
    <div v-if="profile" class="showcase__head">
      <UiSectionLabel :index="3" label="Selected work" class="showcase__label" />
      <h2 id="work-title" class="showcase__heading">
        <span class="showcase__piece showcase__piece--a">
          <span v-reveal><UiAccentText :text="profile.work.heading[0]!" /></span>
        </span>
        <span class="showcase__piece showcase__piece--b">
          <span v-reveal><UiAccentText :text="profile.work.heading[1]!" /></span>
        </span>
        <span class="showcase__marquee" aria-hidden="true">
          <span class="showcase__marquee-track"><span>→</span><span>→</span></span>
        </span>
        <span class="showcase__piece showcase__piece--c">
          <span v-reveal><UiAccentText :text="profile.work.heading[2]!" /></span>
        </span>
      </h2>
      <p class="showcase__subtitle t-label">{{ profile.work.subtitle }}</p>
    </div>

    <ul role="list" class="showcase__grid">
      <li
        v-for="(project, i) in projects"
        :key="project.slug"
        class="showcase__item"
        :class="[`showcase__item--${i}`, `showcase__item--${sizeFor(i)}`]"
      >
        <WorkShowcaseCard :project="project" :size="sizeFor(i)" />
      </li>
    </ul>

    <div class="showcase__more">
      <UiGlassButton to="/work" variant="secondary">View all work ({{ total }})</UiGlassButton>
    </div>
  </section>
</template>

<style scoped lang="scss">
.showcase__head {
  display: grid;
  gap: 1.5rem;
  margin-bottom: clamp(3rem, 8vw, 6rem);
}

.showcase__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.25em;
  font-family: var(--font-display);
  font-size: clamp(3rem, 9vw, 7rem);
  font-weight: 400;
  line-height: 0.9;
  text-transform: uppercase;

  // Italic piece keeps normal case
  :deep(em) {
    text-transform: none;
  }
}

// Arrow marquee: two arrows slide through a small clipped window, like a tiny ticker
.showcase__marquee {
  display: inline-block;
  width: 0.6em;
  overflow: hidden;
  font-size: 0.55em;
  color: var(--primary);
  vertical-align: middle;
}

.showcase__marquee-track {
  display: inline-flex;
  animation: showcase-arrows 1.6s linear infinite;

  > span {
    flex: none;
    width: 0.6em;
    text-align: center;
  }
}

@keyframes showcase-arrows {
  from {
    transform: translateX(-50%);
  }
  to {
    transform: translateX(0);
  }
}

.showcase__subtitle {
  max-width: 26rem;
  line-height: 1.6;
  text-align: justify;
}

// Desktop: everything placed on the 12-column grid
@media (min-width: 1024px) {
  .showcase__head {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    column-gap: 1.2rem;
    row-gap: 1rem;
  }

  .showcase__label {
    grid-column: 1 / -1;
  }

  // The heading shares the section's 12 columns (subgrid keeps it a real heading for
  // screen readers, which display: contents could lose)
  .showcase__heading {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: subgrid;
    align-items: baseline;
  }

  .showcase__piece--a {
    grid-column: 1 / span 4;
  }

  .showcase__piece--b {
    grid-column: 5 / span 4;
  }

  .showcase__marquee {
    grid-column: 9;
    justify-self: center;
    align-self: center;
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 3.5rem);
    line-height: 1;
  }

  .showcase__piece--c {
    grid-column: 10 / -1;
    justify-self: end;
  }

  // Under the italic word, stretched to exactly its four columns
  .showcase__subtitle {
    grid-column: 5 / span 4;
    max-width: none;
  }
}

// Cards: one column on phones, two on tablets, the staggered 12-column layout on desktop
.showcase__grid {
  display: grid;
  gap: 3rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 1.5rem;

    .showcase__item--small {
      padding-inline: 12%;
    }
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    column-gap: 1.2rem;
    row-gap: 4rem;
    align-items: start;

    .showcase__item--small {
      padding-inline: 0;
    }

    // Large cards span 3 columns, small ones 2; a few are pushed down for the stagger
    .showcase__item--0 {
      grid-column: 1 / span 3;
      grid-row: 1;
    }
    .showcase__item--1 {
      grid-column: 7 / span 2;
      grid-row: 1;
      margin-top: 16rem;
    }
    .showcase__item--2 {
      grid-column: 10 / span 3;
      grid-row: 1;
    }
    .showcase__item--3 {
      grid-column: 4 / span 2;
      grid-row: 2;
    }
    .showcase__item--4 {
      grid-column: 8 / span 3;
      grid-row: 2;
    }
    .showcase__item--5 {
      grid-column: 1 / span 3;
      grid-row: 3;
    }
    .showcase__item--6 {
      grid-column: 7 / span 2;
      grid-row: 3;
      margin-top: 10rem;
    }
  }
}

.showcase__more {
  display: flex;
  justify-content: center;
  margin-top: 5rem;
}

@media (prefers-reduced-motion: reduce) {
  .showcase__marquee-track {
    animation: none;
  }
}
</style>
