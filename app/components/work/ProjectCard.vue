<script setup lang="ts">
import type { ProjectsCollectionItem } from '@nuxt/content'

const props = withDefaults(
  defineProps<{
    project: ProjectsCollectionItem
    shape?: 'tall' | 'wide'
    headingLevel?: 'h2' | 'h3'
  }>(),
  { shape: 'wide', headingLevel: 'h3' }
)

const number = computed(() => projectNumber(props.project.order))
</script>

<template>
  <article class="card" :class="`card--${shape}`">
    <NuxtLink :to="`/work/${project.slug}`" class="card__link">
      <div class="card__media">
        <NuxtImg
          v-if="project.cover"
          :src="project.cover"
          :alt="`${project.title} cover`"
          class="card__image"
          loading="lazy"
        />
        <div v-else class="card__placeholder" aria-hidden="true">
          <span class="card__placeholder-number">{{ number }}</span>
          <span class="card__placeholder-shape t-label">{{ project.particleShape }}</span>
        </div>
      </div>

      <div class="card__body">
        <component :is="headingLevel" class="card__title t-h3">
          <span class="card__arrow" aria-hidden="true">↪</span>
          {{ project.title }}
        </component>
        <p class="t-muted">{{ project.subtitle }}</p>
      </div>
    </NuxtLink>

    <WorkSpecSheet
      class="card__spec"
      :number="number"
      :year="project.year"
      :type="project.type"
      :scope="project.scope"
      :stack="project.stack"
    />
  </article>
</template>

<style scoped lang="scss">
.card {
  display: grid;
  gap: 1.25rem;
}

.card__link {
  display: grid;
  gap: 1.25rem;

  &:hover .card__title {
    color: var(--primary);
  }

  &:hover .card__media {
    transform: scale(0.985);
  }
}

.card__media {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  background: var(--surface);
  aspect-ratio: 16 / 10;
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);

  .card--tall & {
    aspect-ratio: 3 / 4;
  }
}

.card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

// Stand-in until real covers exist in /public/projects/[slug]/cover.webp
.card__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.25rem;
  background:
    radial-gradient(circle at 70% 30%, rgba(var(--color-lavender-rgb), 0.55), transparent 55%),
    radial-gradient(circle at 20% 90%, rgba(var(--primary-rgb), 0.35), transparent 50%),
    var(--surface);
}

.card__placeholder-number {
  font-family: var(--font-display);
  font-size: clamp(4rem, 12vw, 8rem);
  line-height: 0.85;
  color: var(--primary);
}

.card__placeholder-shape {
  color: var(--foreground-muted);
}

.card__body {
  display: grid;
  gap: 0.35rem;
}

.card__title {
  transition: color 0.2s ease;
}

.card__arrow {
  color: var(--primary);
  margin-right: 0.2em;
}

.card__spec {
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}
</style>
