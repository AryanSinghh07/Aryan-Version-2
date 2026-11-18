<script setup lang="ts">
// Section label: the violet pill the home sections open with ("Stack", "Selected work").
// `index` is kept for callers; the pill shows the name only.
defineProps<{ index?: number | string; label: string }>()
</script>

<template>
  <p class="section-label t-label">{{ label }}</p>
</template>

<style scoped lang="scss">
.section-label {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  align-self: start;
  width: fit-content;
  margin: 0;
  padding: 0.45em 0.95em;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 0.8rem;
  line-height: 1.2;
  white-space: nowrap;
}
</style>
