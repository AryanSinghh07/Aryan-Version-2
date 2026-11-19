<script setup lang="ts">
// Headline lines with arrows, the editorial way: each line can be indented and carry an arrow
// before it (↳, at the left edge, pointing into the indented words) or after it (↴). *word* is
// the italic accent. Goes inside a heading; the heading should carry the plain text for screen
// readers (these lines are hidden from them). Motion: utils/arrowMotion.ts.
export interface ArrowLine {
  text: string
  indent?: number
  arrow?: 'start' | 'end'
}

defineProps<{ lines: ArrowLine[] }>()
</script>

<template>
  <span
    v-for="(line, i) in lines"
    :key="i"
    class="arrow-line"
    :style="{ '--indent': line.indent ?? 0 }"
    aria-hidden="true"
  >
    <span v-if="line.arrow === 'start'" class="arrow-line__arrow arrow-start">↳</span>
    <span class="arrow-line__words arrow-words"><UiAccentText :text="line.text" /></span>
    <span v-if="line.arrow === 'end'" class="arrow-line__arrow arrow-end">↴</span>
  </span>
</template>

<style scoped lang="scss">
.arrow-line {
  position: relative;
  display: block;
  padding-left: calc(var(--indent, 0) * 0.9em);
  white-space: nowrap;

  @media (max-width: 640px) {
    white-space: normal;
  }
}

// The words are what the letter motion splits (the arrows stay whole beside them)
.arrow-line__words {
  display: inline-block;
}

// The arrows: thin, in the body font, beside the words
.arrow-line__arrow {
  display: inline-block;
  font-family: var(--font-body);
  font-size: 0.42em;
  font-weight: 300;
  font-style: normal;
  line-height: 1;
  vertical-align: 0.55em;
}

.arrow-start {
  position: absolute;
  left: 0;
  top: 50%;
  // Centred with a margin (the motion animates its transform)
  margin-top: -0.5em;
}

.arrow-end {
  margin-left: 0.5em;
  font-size: 0.5em;
}
</style>
