<script setup lang="ts">
// Small pill label. "accent" is the lime pill (always with plum text, never lime text on white).
withDefaults(defineProps<{ variant?: 'accent' | 'outline' | 'surface' }>(), {
  variant: 'accent',
})
</script>

<template>
  <span class="tag t-label" :class="`tag--${variant}`"><slot /></span>
</template>

<style scoped lang="scss">
.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.4em 0.85em;
  border-radius: 999px;
  white-space: nowrap;
}

.tag--accent {
  background: var(--accent);
  color: var(--on-accent);
}

.tag--outline {
  border: 1px solid var(--border);
  color: var(--foreground);
}

.tag--surface {
  background: var(--surface);
  color: var(--foreground);
}
</style>
