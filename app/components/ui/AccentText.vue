<script setup lang="ts">
// Renders content text with two marks:
//   *asterisks*      the italic accent word: "Built to *ship*"
//   ==double equals== a highlighted keyword: "help ==real farmers=="
const props = defineProps<{ text: string }>()

type Part = { kind: 'accent' | 'keyword' | 'plain'; value: string }

const parts = computed<Part[]>(() =>
  props.text
    .split(/(\*[^*]+\*|==[^=]+==)/g)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return { kind: 'accent', value: part.slice(1, -1) }
      }
      if (part.startsWith('==') && part.endsWith('==')) {
        return { kind: 'keyword', value: part.slice(2, -2) }
      }
      return { kind: 'plain', value: part }
    })
)
</script>

<template>
  <template v-for="(part, i) in parts" :key="i">
    <em v-if="part.kind === 'accent'">{{ part.value }}</em>
    <mark v-else-if="part.kind === 'keyword'" class="keyword">{{ part.value }}</mark>
    <template v-else>{{ part.value }}</template>
  </template>
</template>
