<script setup lang="ts">
usePageSeo({
  title: 'Work',
  description:
    'All projects by Aryan Singh: computer vision for farmers, a CBT chatbot for students, cattle classification for the Rashtriya Gokul Mission and more.',
})

const { data: projects } = await useProjects()

// The Work page, in the same style as About: a plain near-black page (the 3D world rests
// behind it). The headline, a band of the tools used, the projects as full-screen cards that
// stack up as you scroll, then an index of every project with a preview under the pointer.
const store = useAppStore()
onMounted(() => (store.worldPaused = true))
onBeforeUnmount(() => (store.worldPaused = false))

/** Every technology used, the most used first */
const tools = computed(() => {
  const counts = new Map<string, number>()
  for (const p of projects.value ?? [])
    for (const s of p.stack) counts.set(s, (counts.get(s) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
})
</script>

<template>
  <div v-if="projects" class="work-page">
    <WorkIntro :projects="projects" />
    <WorkMarquee :words="tools" />
    <WorkStack :projects="projects" />
    <WorkProjectIndex :projects="projects" />
  </div>
</template>

<style scoped lang="scss">
// The same plain near-black as the home page past its portal and the About page; by day,
// the page colour
.work-page {
  --page-bg: var(--background);

  position: relative;
  background-color: var(--page-bg);
  overflow-x: clip;
}

:global([data-theme='dark'] .work-page) {
  --page-bg: #121212;
}
</style>
