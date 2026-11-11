<script setup lang="ts">
const { data: stack } = await useStack()
</script>

<template>
  <section v-if="stack" class="stack section container" aria-labelledby="stack-title">
    <div class="section__head">
      <UiSectionLabel :index="2" label="Stack" />
      <h2 id="stack-title" v-reveal class="t-h2"><UiAccentText :text="stack.headline" /></h2>
    </div>

    <ol role="list" class="stack__groups">
      <li v-for="(group, i) in stack.groups" :key="group.title" class="stack__group">
        <p class="t-label stack__index">[{{ projectNumber(i + 1) }}]</p>
        <h3 class="t-h3">{{ group.title }}</h3>
        <ul role="list" class="stack__tools">
          <li v-for="tool in group.tools" :key="tool">
            <UiTag variant="outline">{{ tool }}</UiTag>
          </li>
        </ul>
      </li>
    </ol>
  </section>
</template>

<style scoped lang="scss">
.stack__groups {
  display: grid;
  gap: 3rem 4rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.stack__group {
  display: grid;
  gap: 1rem;
  align-content: start;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.stack__index {
  color: var(--primary);
}

.stack__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
