<script setup lang="ts">
// Text roll for links: the text exists twice in a one-line window, and when the closest
// link or button is hovered (or focused from the keyboard) both copies slide up, the copy
// landing where the original was. Screen readers hear the text once.
</script>

<template>
  <span class="roll-text">
    <span class="roll-text__copy"><slot /></span>
    <span class="roll-text__copy roll-text__copy--next" aria-hidden="true"><slot /></span>
  </span>
</template>

<style scoped lang="scss">
.roll-text {
  position: relative;
  display: inline-grid;
  overflow: hidden;
  vertical-align: bottom;
  padding-block: 0.1em;
  margin-block: -0.1em;
}

.roll-text__copy {
  grid-area: 1 / 1;
  transition: transform 0.5s var(--ease-out);
}

.roll-text__copy--next {
  transform: translateY(110%);
  transition-delay: 0.03s;
}

@media (hover: hover) and (pointer: fine) {
  :is(a, button):hover > .roll-text,
  :is(a, button):hover > * > .roll-text {
    .roll-text__copy {
      transform: translateY(-120%);
    }

    .roll-text__copy--next {
      transform: translateY(0);
    }
  }
}

:is(a, button):focus-visible > .roll-text,
:is(a, button):focus-visible > * > .roll-text {
  .roll-text__copy {
    transform: translateY(-120%);
  }

  .roll-text__copy--next {
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .roll-text__copy {
    transition: none;
  }
}
</style>
