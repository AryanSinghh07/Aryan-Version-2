<script setup lang="ts">
// Project facts in mono text. Becomes the hover overlay on cards in Phase 8.
defineProps<{ number: string; year: number; type: string; scope: string; stack: string[] }>()
</script>

<template>
  <dl class="spec t-label">
    <div>
      <dt>No.</dt>
      <dd>[{{ number }}]</dd>
    </div>
    <div>
      <dt>Year</dt>
      <dd>{{ year }}</dd>
    </div>
    <div>
      <dt>Type</dt>
      <dd>{{ type }}</dd>
    </div>
    <div>
      <dt>Scope</dt>
      <dd>{{ scope }}</dd>
    </div>
    <div class="spec__stack">
      <dt>Stack</dt>
      <dd>{{ stack.join(' · ') }}</dd>
    </div>
  </dl>
</template>

<style scoped lang="scss">
.spec {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 1.5rem;

  div {
    display: grid;
    gap: 0.2rem;
  }

  dt {
    color: var(--foreground-muted);
  }

  dd {
    margin: 0;
  }
}

.spec__stack {
  grid-column: 1 / -1;
}
</style>
