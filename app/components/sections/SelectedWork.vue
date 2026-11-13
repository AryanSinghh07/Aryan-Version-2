<script setup lang="ts">
const { data: projects } = await useProjects()

const featured = computed(() => (projects.value ?? []).filter((p) => p.featured).slice(0, 4))
const total = computed(() => projectNumber(projects.value?.length ?? 0))
</script>

<template>
  <section class="work section container" aria-labelledby="work-title">
    <div class="section__head work__head">
      <UiSectionLabel :index="3" label="Selected work" />
      <h2 id="work-title" v-reveal class="t-h2"><UiAccentText text="Built to *ship*" /></h2>
    </div>

    <WorkProjectGrid :projects="featured" />

    <div class="work__more">
      <UiGlassButton to="/work" variant="secondary">View all work ({{ total }})</UiGlassButton>
    </div>
  </section>
</template>

<style scoped lang="scss">
.work__more {
  display: flex;
  justify-content: center;
  margin-top: 5rem;
}
</style>
