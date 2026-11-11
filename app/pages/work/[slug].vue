<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: projects } = await useProjects()

const index = computed(() => (projects.value ?? []).findIndex((p) => p.slug === slug.value))
const project = computed(() => projects.value?.[index.value])
const next = computed(() => {
  const list = projects.value ?? []
  return list.length ? list[(index.value + 1) % list.length] : undefined
})

if (!project.value) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true })
}

useSeoMeta({
  title: () => project.value?.title ?? 'Project',
  description: () => project.value?.summary,
})
</script>

<template>
  <article v-if="project" class="case page-top">
    <header class="case__hero container">
      <p class="t-label t-muted">
        <NuxtLink to="/work" class="case__back">← All work</NuxtLink>
      </p>
      <p class="t-label case__number">[{{ projectNumber(project.order) }}] · {{ project.year }}</p>
      <h1 v-reveal class="t-h2">{{ project.title }}</h1>
      <p class="case__subtitle">{{ project.subtitle }}</p>
    </header>

    <div class="case__media container">
      <NuxtImg
        v-if="project.cover"
        :src="project.cover"
        :alt="`${project.title} cover`"
        class="case__cover"
      />
      <div v-else class="case__placeholder" aria-hidden="true">
        <span>{{ projectNumber(project.order) }}</span>
      </div>
    </div>

    <div class="case__layout container">
      <aside class="case__aside">
        <WorkSpecSheet
          :number="projectNumber(project.order)"
          :year="project.year"
          :type="project.type"
          :scope="project.scope"
          :stack="project.stack"
        />
        <div class="case__links">
          <UiGlassButton v-if="project.github" :href="project.github">GitHub ↗</UiGlassButton>
          <UiGlassButton v-if="project.live" :href="project.live" variant="primary">
            Live site ↗
          </UiGlassButton>
        </div>
      </aside>

      <div class="case__content">
        <p class="case__summary">{{ project.summary }}</p>
        <ContentRenderer :value="project" class="case__prose" />

        <section v-if="project.results?.length" aria-labelledby="results-title">
          <h2 id="results-title" class="t-label t-muted case__heading">Results</h2>
          <ul role="list" class="case__list">
            <li v-for="r in project.results" :key="r">{{ r }}</li>
          </ul>
        </section>

        <section v-if="project.awards?.length" aria-labelledby="awards-title">
          <h2 id="awards-title" class="t-label t-muted case__heading">Awards</h2>
          <ul role="list" class="case__list">
            <li v-for="a in project.awards" :key="a">{{ a }}</li>
          </ul>
        </section>

        <section v-if="project.gallery?.length" aria-labelledby="gallery-title">
          <h2 id="gallery-title" class="t-label t-muted case__heading">Gallery</h2>
          <div class="case__gallery">
            <NuxtImg
              v-for="(img, i) in project.gallery"
              :key="img"
              :src="img"
              :alt="`${project.title} screenshot ${i + 1}`"
              loading="lazy"
            />
          </div>
        </section>
      </div>
    </div>

    <NuxtLink v-if="next" :to="`/work/${next.slug}`" class="case__next container">
      <span class="t-label t-muted">Next project</span>
      <span class="t-h2">
        <span class="case__arrow" aria-hidden="true">↪</span>
        {{ next.title }}
      </span>
    </NuxtLink>
  </article>
</template>

<style scoped lang="scss">
.case__hero {
  display: grid;
  gap: 1.25rem;
  margin-bottom: 3rem;
}

.case__back:hover {
  color: var(--primary);
}

.case__number {
  color: var(--primary);
}

.case__subtitle {
  font-size: 1.25rem;
  color: var(--foreground-muted);
}

.case__media {
  margin-bottom: clamp(3rem, 8vw, 6rem);
}

.case__cover,
.case__placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 1rem;
  object-fit: cover;
}

.case__placeholder {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 70% 30%, rgba(var(--color-lavender-rgb), 0.55), transparent 55%),
    radial-gradient(circle at 20% 90%, rgba(var(--primary-rgb), 0.35), transparent 50%),
    var(--surface);
  font-family: var(--font-display);
  font-size: clamp(6rem, 25vw, 16rem);
  color: var(--primary);
}

.case__layout {
  display: grid;
  gap: 3rem;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    gap: 6rem;
  }
}

.case__aside {
  display: grid;
  gap: 2rem;
  align-content: start;

  @media (min-width: 1024px) {
    position: sticky;
    top: 7rem;
  }
}

.case__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.case__content {
  display: grid;
  gap: 3rem;
  max-width: 44rem;
}

.case__summary {
  font-size: 1.375rem;
  line-height: 1.4;
}

.case__prose {
  display: grid;
  gap: 1rem;
  font-size: 1.0625rem;

  :deep(h2) {
    margin-top: 1.5rem;
    font-family: var(--font-mono);
    font-size: var(--text-label);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--foreground-muted);
  }

  :deep(h2 a) {
    color: inherit;
  }
}

.case__heading {
  margin-bottom: 1rem;
}

.case__list {
  border-top: 1px solid var(--border);

  li {
    padding-block: 0.9rem;
    border-bottom: 1px solid var(--border);
  }
}

.case__gallery {
  display: grid;
  gap: 1rem;

  img {
    border-radius: 0.75rem;
  }
}

.case__next {
  display: grid;
  gap: 1rem;
  margin-top: clamp(5rem, 12vw, 10rem);
  padding-block: 4rem;
  border-top: 1px solid var(--border);

  &:hover .t-h2 {
    color: var(--primary);
  }
}

.case__arrow {
  color: var(--primary);
}
</style>
