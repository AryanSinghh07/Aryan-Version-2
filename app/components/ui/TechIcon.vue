<script setup lang="ts">
// A tool's logo (utils/techIcons.ts): a filled brand mark or an outline glyph in a 24×24 box.
// It sits in the text colour and exposes the brand colour as --brand, so a parent can light
// it up on hover. Decorative: the tool's name is always written next to it.
const props = defineProps<{ name: string }>()
const icon = computed(() => techIcon(props.name))
</script>

<template>
  <svg
    class="tech-icon"
    :class="{ 'tech-icon--outline': icon.outline }"
    viewBox="0 0 24 24"
    :style="icon.color ? { '--brand': icon.color } : undefined"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="icon.path" />
  </svg>
</template>

<style scoped lang="scss">
.tech-icon {
  --brand: currentColor;
  display: block;
  width: 1.5rem;
  height: 1.5rem;
  flex: none;
  fill: currentColor;
  transition:
    fill 0.35s var(--ease-out),
    stroke 0.35s var(--ease-out),
    transform 0.45s var(--ease-out);
}

.tech-icon--outline {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
