<script setup lang="ts">
// Renders content text with these marks:
//   *asterisks*        the italic accent word: "Built to *ship*"
//   **double**         bold: "**Full-Stack Developer**"
//   ==double equals==  a highlighted keyword: "help ==real farmers=="
//   :name:             a small animated icon between words (utils/inlineIcons.ts): "students :heart:"
//                      (unknown names stay as written)
const props = defineProps<{ text: string }>()

type Part = { kind: 'accent' | 'bold' | 'keyword' | 'icon' | 'plain'; value: string }

const parts = computed<Part[]>(() =>
  props.text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|==[^=]+==|:[a-z]+:)/g)
    .filter(Boolean)
    .map((part): Part => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return { kind: 'bold', value: part.slice(2, -2) }
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return { kind: 'accent', value: part.slice(1, -1) }
      }
      if (part.startsWith('==') && part.endsWith('==')) {
        return { kind: 'keyword', value: part.slice(2, -2) }
      }
      if (/^:[a-z]+:$/.test(part) && part.slice(1, -1) in INLINE_ICONS) {
        return { kind: 'icon', value: part.slice(1, -1) }
      }
      return { kind: 'plain', value: part }
    })
)
</script>

<template>
  <template v-for="(part, i) in parts" :key="i">
    <em v-if="part.kind === 'accent'">{{ part.value }}</em>
    <strong v-else-if="part.kind === 'bold'">{{ part.value }}</strong>
    <mark v-else-if="part.kind === 'keyword'" class="keyword">{{ part.value }}</mark>
    <UiInlineIcon v-else-if="part.kind === 'icon'" :name="part.value" />
    <template v-else>{{ part.value }}</template>
  </template>
</template>
