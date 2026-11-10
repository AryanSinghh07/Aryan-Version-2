<script setup lang="ts">
// Renders content text where *asterisks* mark the italic accent word: "Built to *ship*"
const props = defineProps<{ text: string }>()

const parts = computed(() =>
  props.text
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('*') && part.endsWith('*')
        ? { accent: true, value: part.slice(1, -1) }
        : { accent: false, value: part }
    )
)
</script>

<template>
  <template v-for="(part, i) in parts" :key="i">
    <em v-if="part.accent">{{ part.value }}</em>
    <template v-else>{{ part.value }}</template>
  </template>
</template>
