<script setup lang="ts">
// A numbered list, (001) to (00N), with one active row: an arrow in place of its number and
// the item in full colour, the rows around it dimming with distance. `active` comes from the
// scroll (usePinnedSteps); hovering a row (or focusing it, when `focusable`) shows that one
// instead. Emits `show` with the row on display, so a detail panel can follow it.
const props = withDefaults(
  defineProps<{
    items: string[]
    active: number
    /** Rows take keyboard focus (when they drive a detail panel) */
    focusable?: boolean
  }>(),
  { focusable: false }
)
const emit = defineEmits<{ show: [index: number] }>()

const hovered = ref<number | null>(null)
const shown = computed(() => hovered.value ?? props.active)
watch(shown, (i) => emit('show', i), { immediate: true })

const number = (i: number) => `(${String(i + 1).padStart(3, '0')})`

/** How bright a row is: the shown one in full, the others fading with distance */
function rowOpacity(i: number) {
  return Math.max(0.12, 1 - Math.abs(i - shown.value) * 0.17)
}
</script>

<template>
  <ol role="list" class="step-list" @pointerleave="hovered = null">
    <li
      v-for="(item, i) in items"
      :key="item"
      class="step-list__row"
      :class="{ 'is-active': shown === i }"
      :style="{ '--row-opacity': rowOpacity(i) }"
      :tabindex="focusable ? 0 : undefined"
      @pointerenter="hovered = i"
      @focus="hovered = i"
      @blur="hovered = null"
    >
      <span class="step-list__num t-label" aria-hidden="true">
        <span class="step-list__num-text">{{ number(i) }}</span>
        <span class="step-list__num-arrow">↳</span>
      </span>
      <span class="step-list__item">{{ item }}</span>
    </li>
  </ol>
</template>

<style scoped lang="scss">
.step-list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step-list__row {
  display: grid;
  grid-template-columns: 5rem 1fr;
  align-items: center;
  padding: clamp(0.5rem, 1vw, 0.9rem) 0;
  opacity: var(--row-opacity, 1);
  transition: opacity 0.5s var(--ease-out);
  cursor: default;

  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 4px;
    border-radius: 0.5rem;
  }
}

.step-list__num {
  position: relative;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
}

.step-list__num-text,
.step-list__num-arrow {
  display: inline-block;
  transition:
    opacity 0.4s var(--ease-out),
    transform 0.5s var(--ease-out);
}

// The active row swaps its number for an arrow
.step-list__num-arrow {
  position: absolute;
  left: 0;
  top: 50%;
  font-family: var(--font-body);
  font-size: 1.9rem;
  line-height: 1;
  color: var(--foreground);
  opacity: 0;
  transform: translate(-10px, -55%);
}

.step-list__row.is-active {
  .step-list__num-text {
    opacity: 0;
    transform: translateX(10px);
  }

  .step-list__num-arrow {
    opacity: 1;
    transform: translate(0, -55%);
  }
}

.step-list__item {
  justify-self: end;
  text-align: right;
  font-size: clamp(1.4rem, 2.1vw, 2.6rem);
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.02em;
  // Dimmed rows in a neutral grey (the page past the hero's portal is a plain near-black)
  color: color-mix(in srgb, var(--foreground) 60%, transparent);
  transition: color 0.4s var(--ease-out);

  .is-active & {
    color: var(--foreground);
  }
}

@media (max-width: 640px) {
  .step-list__row {
    grid-template-columns: 3.5rem 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .step-list__row,
  .step-list__item,
  .step-list__num-text,
  .step-list__num-arrow {
    transition: none;
  }
}
</style>
