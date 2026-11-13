<script setup lang="ts">
import type { ProjectsCollectionItem } from '@nuxt/content'

// A project card for the home showcase: a 16:20 image (drawn as a WebGL plane that ripples
// under the pointer), a blueprint-style spec sheet that decodes over it on hover, then a
// mono scope line and the title, which an arrow slides in front of.
const props = defineProps<{ project: ProjectsCollectionItem; size: 'large' | 'small' }>()

const number = computed(() => projectNumber(props.project.order))
/** "Computer vision, mobile app" → "COMPUTER VISION / MOBILE APP" (uppercased by CSS) */
const scope = computed(() =>
  [props.project.type, ...props.project.scope.split(',')]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' / ')
)

// Spec rows: label and value sit on different columns per row, a deliberate zigzag
const rows = computed(() => [
  { label: 'Prjct', value: `/${number.value}` },
  { label: 'Created', value: String(props.project.year) },
  { label: 'Name', value: props.project.title },
  { label: 'Type', value: props.project.type },
  { label: 'Scope', value: props.project.scope },
  { label: 'Stack', value: props.project.stack.join(', ') },
])
</script>

<template>
  <article class="show-card" :class="`show-card--${size}`">
    <NuxtLink :to="`/work/${project.slug}`" class="show-card__link" data-cursor="View">
      <div class="show-card__frame">
        <div
          class="show-card__media"
          data-webgl-media
          :data-webgl-number="number"
          :data-webgl-label="project.particleShape"
        >
          <NuxtImg
            v-if="project.cover"
            :src="project.cover"
            :alt="`${project.title} cover`"
            class="show-card__image"
            loading="lazy"
          />
          <div v-else class="show-card__placeholder" aria-hidden="true">
            <span class="show-card__number" data-webgl-text="primary">{{ number }}</span>
            <span class="t-label" data-webgl-text="muted">{{ project.particleShape }}</span>
          </div>
        </div>

        <!-- Beside the media, not inside it: WebGL hides the media element itself -->
        <dl class="show-card__spec t-label" aria-hidden="true">
          <div v-for="(row, i) in rows" :key="row.label" class="show-card__row" :class="`r${i}`">
            <dt>{{ row.label }}</dt>
            <dd v-scramble>{{ row.value }}</dd>
          </div>
        </dl>
      </div>

      <p class="show-card__scope t-label t-muted">{{ scope }}</p>
      <h3 class="show-card__title">
        <span class="show-card__window">
          <span class="show-card__arrow" aria-hidden="true">→</span>
          <span class="show-card__name">{{ project.title }}</span>
        </span>
      </h3>
    </NuxtLink>
  </article>
</template>

<style scoped lang="scss">
.show-card__link {
  display: grid;
  gap: 0.9rem;
}

.show-card__frame {
  position: relative;
  border-radius: 1rem;
  overflow: hidden;
}

.show-card__media {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  aspect-ratio: 16 / 20;
  background: var(--surface);
}

.show-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

// Stand-in until real covers exist in /public/projects/[slug]/cover.webp
.show-card__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem;
  background:
    radial-gradient(circle at 70% 30%, rgba(var(--color-lavender-rgb), 0.55), transparent 55%),
    radial-gradient(circle at 20% 90%, rgba(var(--primary-rgb), 0.35), transparent 50%),
    var(--surface);

  > :last-child {
    color: var(--foreground-muted);
  }
}

.show-card__number {
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 7vw, 6rem);
  line-height: 0.85;
  color: var(--primary);
}

// Spec sheet: light mono text on a dark wash, each row its own 12-column grid
.show-card__spec {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: end;
  gap: 0.45rem;
  margin: 0;
  padding: 1rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: #fbfaff;
  background: linear-gradient(
    to top,
    rgba(18, 10, 31, 0.92),
    rgba(18, 10, 31, 0.55) 55%,
    transparent
  );
  opacity: 0;
  transition: opacity 0.45s var(--ease-out);
  pointer-events: none;

  dt {
    color: rgba(251, 250, 255, 0.6);
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
}

.show-card__row {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  column-gap: 0.3rem;

  dt,
  dd {
    grid-row: 1;
  }
}

// The zigzag: label and value start on different columns on each row
.r0 dt {
  grid-column: 1 / span 3;
}
.r0 dd {
  grid-column: 5 / -1;
}
.r1 dt {
  grid-column: 3 / span 4;
}
.r1 dd {
  grid-column: 8 / -1;
}
.r2 dt {
  grid-column: 1 / span 3;
}
.r2 dd {
  grid-column: 4 / -1;
}
.r3 dt {
  grid-column: 4 / span 3;
}
.r3 dd {
  grid-column: 8 / -1;
}
.r4 dt {
  grid-column: 2 / span 3;
}
.r4 dd {
  grid-column: 5 / -1;
}
.r5 dt {
  grid-column: 1 / span 3;
}
.r5 dd {
  grid-column: 6 / -1;
}

.show-card__scope {
  font-size: 0.6875rem;
}

// Title: display serif, tall and tight; the arrow waits outside a clipped window
.show-card__title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 400;
  line-height: 0.95;
}

.show-card__window {
  display: inline-flex;
  align-items: baseline;
  overflow: hidden;
  max-width: 100%;
}

.show-card__arrow {
  flex: none;
  width: 0;
  color: var(--primary);
  transform: translateX(-110%);
  transition:
    width 0.5s var(--ease-out),
    transform 0.5s var(--ease-out);
}

.show-card__name {
  transition: color 0.3s var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .show-card__link:hover,
  .show-card__link:focus-visible {
    .show-card__spec {
      opacity: 1;
    }

    .show-card__arrow {
      width: 1.1em;
      transform: none;
    }

    .show-card__name {
      color: var(--primary);
    }
  }
}

// Keyboard focus shows the spec sheet on any device
.show-card__link:focus-visible .show-card__spec {
  opacity: 1;
}

.show-card__link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 6px;
  border-radius: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .show-card__arrow,
  .show-card__spec {
    transition: none;
  }
}
</style>
