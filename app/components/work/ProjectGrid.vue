<script setup lang="ts">
import type { ProjectsCollectionItem } from '@nuxt/content'

// Asymmetric two-column grid: the right column sits lower, and card shapes alternate.
defineProps<{ projects: ProjectsCollectionItem[]; headingLevel?: 'h2' | 'h3' }>()

// tall, wide, wide, tall, ... so neighbours never share a shape
const shapeFor = (i: number) => (i % 4 === 0 || i % 4 === 3 ? 'tall' : 'wide')
</script>

<template>
  <ul role="list" class="grid">
    <li v-for="(project, i) in projects" :key="project.slug" class="grid__item">
      <WorkProjectCard :project="project" :shape="shapeFor(i)" :heading-level="headingLevel" />
    </li>
  </ul>
</template>

<style scoped lang="scss">
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: clamp(2rem, 6vw, 6rem);
    row-gap: 6rem;

    .grid__item:nth-child(even) {
      margin-top: 10rem;
    }
  }
}
</style>
