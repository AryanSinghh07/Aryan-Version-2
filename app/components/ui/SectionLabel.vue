<script setup lang="ts">
// Section label such as "01 — About"
const props = defineProps<{ index: number | string; label: string }>()

const number = computed(() =>
  typeof props.index === 'number' ? String(props.index).padStart(2, '0') : props.index
)
</script>

<template>
  <p class="section-label t-label">
    <span class="section-label__index">{{ number }}</span>
    <span aria-hidden="true">—</span>
    <span>{{ label }}</span>
  </p>
</template>

<style scoped lang="scss">
.section-label {
  display: inline-flex;
  gap: 0.6em;
  color: var(--foreground-muted);
}

.section-label__index {
  color: var(--primary);
}
</style>
