<script setup lang="ts">
// Ruled list of awards. Proof images following the cursor are added in Phase 8.
const { data: recognition } = await useRecognition()
</script>

<template>
  <section
    v-if="recognition"
    class="recognition section container"
    aria-labelledby="recognition-title"
  >
    <div class="section__head">
      <UiSectionLabel :index="4" label="Recognition" />
      <h2 id="recognition-title" v-reveal class="t-h2">
        <UiAccentText :text="recognition.headline" />
      </h2>
    </div>

    <ol role="list" class="recognition__list">
      <li v-for="(item, i) in recognition.items" :key="item.id" class="recognition__row">
        <span class="recognition__index t-label">[{{ projectNumber(i + 1) }}]</span>
        <h3 class="recognition__title t-h3">{{ item.title }}</h3>
        <span class="recognition__type t-label t-muted">{{ item.type }}</span>
        <p class="recognition__detail">{{ item.detail }}</p>
      </li>
    </ol>
  </section>
</template>

<style scoped lang="scss">
.recognition__list {
  border-top: 1px solid var(--border);
}

.recognition__row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1.25rem;
  padding-block: 1.75rem;
  border-bottom: 1px solid var(--border);
  transition: background-color 0.25s ease;

  &:hover {
    background: rgba(var(--primary-rgb), 0.05);
  }

  @media (min-width: 1024px) {
    grid-template-columns: 4rem minmax(0, 1.4fr) 10rem minmax(0, 1.6fr);
    align-items: baseline;
  }
}

.recognition__index {
  color: var(--primary);
}

.recognition__type,
.recognition__detail {
  grid-column: 2;

  @media (min-width: 1024px) {
    grid-column: auto;
  }
}
</style>
