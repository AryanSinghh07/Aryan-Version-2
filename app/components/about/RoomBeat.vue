<script setup lang="ts">
// One beat of the About room story: a full-screen frame laid out like an editorial spread.
// intro: a small line, then the big headline along the foot · center: the headline at the
// top, a caption at the foot · left / right: a pill, the headline and a paragraph.
// Headlines are the uppercase display serif with an italic accent word (*word*) and ↳ / ↴
// arrows; lines can be indented. Over the room (`overlay`) the frames stack on screen and take
// turns (RoomStory); otherwise they are plain sections.
import type { ArrowLine } from '~/components/ui/ArrowLines.vue'

export interface RoomBeatContent {
  layout: 'intro' | 'center' | 'left' | 'right'
  label?: string
  kicker?: string
  lines: ArrowLine[]
  text?: string
  caption?: string
}

const props = defineProps<{ beat: RoomBeatContent; first?: boolean; overlay?: boolean }>()

/** Plain text of the headline, for screen readers (the visible one is split into letters) */
const spoken = computed(() => props.beat.lines.map((l) => l.text.replace(/\*/g, '')).join(' '))
</script>

<template>
  <section
    class="room-beat container"
    :class="[`room-beat--${beat.layout}`, { 'is-overlay': overlay }]"
    :aria-label="beat.label ?? spoken"
  >
    <div class="room-beat__copy">
      <!-- The opening line, highlighted like a marker stroke (it sweeps in, see RoomStory) -->
      <p v-if="beat.kicker" class="room-beat__kicker room-beat__small t-label text-glitch">
        <span class="room-beat__mark room-beat__scramble">{{ beat.kicker }}</span>
      </p>
      <span v-if="beat.label" class="room-beat__label room-beat__small t-label">
        {{ beat.label }}
      </span>
      <component :is="first ? 'h1' : 'h2'" class="room-beat__headline t-display text-glitch">
        <span class="sr-only">{{ spoken }}</span>
        <UiArrowLines :lines="beat.lines" />
      </component>
      <p
        v-if="beat.text"
        class="room-beat__text room-beat__small room-beat__scramble t-label text-glitch"
      >
        {{ beat.text }}
      </p>
    </div>
    <p
      v-if="beat.caption"
      class="room-beat__caption room-beat__small room-beat__scramble t-label text-glitch"
    >
      {{ beat.caption }}
    </p>
  </section>
</template>

<style scoped lang="scss">
.room-beat {
  display: flex;
  flex-direction: column;
  min-height: 90svh;
  padding-block: clamp(6rem, 14vh, 9rem) clamp(2.5rem, 6vh, 4rem);
}

// Over the room: every frame fills the screen, stacked; RoomStory fades them in turn
.room-beat.is-overlay {
  position: absolute;
  inset: 0;
  min-height: 0;
  height: 100%;
  visibility: hidden;
  opacity: 0;
}

.room-beat__copy {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.5rem;
}

// Over the room, a soft round wash in the page colour sits behind the words (dark at night,
// light by day) so they read over any part of the room. It is outside the letters' masks,
// so it never shows as boxes.
.is-overlay .room-beat__copy::before,
.is-overlay .room-beat__caption::before {
  content: '';
  position: absolute;
  inset: -18% -12%;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(closest-side, rgba(var(--background-rgb), 0.6), transparent);
}

.room-beat__caption {
  position: relative;
  isolation: isolate;
}

// Intro: the small line, then the headline along the foot of the screen
.room-beat--intro {
  justify-content: flex-end;
}

// Centre: the statement at the top, the caption at the foot
.room-beat--center {
  justify-content: space-between;
  align-items: center;
  text-align: center;

  .room-beat__copy {
    align-items: center;
  }
}

// Left and right: pill, headline and paragraph in the middle of the screen
.room-beat--left,
.room-beat--right {
  justify-content: center;
}

.room-beat--right .room-beat__copy {
  @media (min-width: 900px) {
    width: min(46%, 44rem);
    margin-left: auto;
  }
}

// ---------------------------------------------------------------- Type
.room-beat__headline {
  margin: 0;
  font-size: clamp(2.75rem, 6vw, 8.5rem);
  line-height: 0.92;
  color: var(--foreground);
  text-wrap: initial;

  :deep(em) {
    color: var(--foreground);
  }
}

.room-beat--intro .room-beat__headline {
  font-size: clamp(2.75rem, 6.6vw, 9.5rem);
}

.room-beat__kicker,
.room-beat__text,
.room-beat__caption {
  max-width: 34rem;
  margin: 0;
  // While it decodes the random letters replace the spaces too: let that string wrap
  overflow-wrap: anywhere;
  font-size: clamp(0.8rem, 0.95vw, 1rem);
  line-height: 1.45;
  letter-spacing: 0.06em;
  color: var(--foreground);
}

.room-beat__kicker {
  max-width: 40rem;
  font-size: clamp(0.95rem, 1.35vw, 1.4rem);
  line-height: 1.7;
  letter-spacing: 0.04em;
}

// A violet-to-pink marker behind the words, wrapping line by line; --mark sweeps it across
.room-beat__mark {
  --mark: 100%;

  padding: 0.18em 0.45em;
  border-radius: 0.3em;
  background-image: linear-gradient(
    90deg,
    rgba(var(--primary-rgb), 0.92),
    rgba(255, 111, 208, 0.8)
  );
  background-repeat: no-repeat;
  background-size: var(--mark) 100%;
  color: #fff;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  box-shadow: none;
}

.room-beat__label {
  padding: 0.45em 0.95em;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 0.8rem;
  line-height: 1.2;
}
</style>
