<script setup lang="ts">
usePageSeo({
  title: 'Work',
  description:
    'All projects by Aryan Singh: computer vision for farmers, a CBT chatbot for students, cattle classification for the Rashtriya Gokul Mission and more.',
})

const { data: projects } = await useProjects()

const filters = computed(() => ['All', ...new Set((projects.value ?? []).map((p) => p.type))])
const active = ref('All')
const visible = computed(() =>
  (projects.value ?? []).filter((p) => active.value === 'All' || p.type === active.value)
)
</script>

<template>
  <div class="work-page page-top container">
    <header class="section__head">
      <UiSectionLabel :index="2" label="Work" />
      <h1 v-reveal class="t-hero"><UiAccentText text="All *work*" /></h1>
      <p class="work-page__count t-label t-muted">
        {{ projectNumber(projects?.length ?? 0) }} projects · 2023–2026
      </p>
    </header>

    <div class="work-page__filters" role="group" aria-label="Filter projects">
      <button
        v-for="f in filters"
        :key="f"
        type="button"
        class="work-page__filter t-label"
        :aria-pressed="active === f"
        @click="active = f"
      >
        {{ f }}
      </button>
    </div>
    <p class="sr-only" aria-live="polite">Showing {{ visible.length }} projects</p>

    <WorkProjectGrid :projects="visible" heading-level="h2" class="work-page__grid" />
  </div>
</template>

<style scoped lang="scss">
.work-page {
  padding-bottom: clamp(5rem, 12vw, 10rem);
}

.work-page__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 4rem;
}

.work-page__filter {
  min-height: 40px;
  padding: 0.5em 1.1em;
  border: 1px solid var(--border);
  border-radius: 999px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;

  &:hover {
    border-color: var(--primary);
  }

  &[aria-pressed='true'] {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
  }
}
</style>
