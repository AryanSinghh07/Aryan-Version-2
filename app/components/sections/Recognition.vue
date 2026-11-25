<script setup lang="ts">
// "Proof of work", in the same design as "Behind the build": the section's statement
// (UiStatement), then a numbered list of the awards (UiStepList) beside a panel for the one on
// display: its type and year, the headline stat ("34th", "2,000+") and what it means, a line
// about it, photos from the event and a link to the project. Once the statement has gone by, the panel and the list
// pin mid-screen and the scroll steps through the awards (usePinnedSteps); after the last one
// the page scrolls on. Hovering or focusing a row shows that award.
const { data: recognition } = await useRecognition()

const block = ref<HTMLElement | null>(null)
const active = ref(0)
const shown = ref(0)

const titles = computed(() => recognition.value?.items.map((item) => item.title) ?? [])

usePinnedSteps(
  block,
  () => recognition.value?.items.length ?? 1,
  (i) => (active.value = i),
  0.4
)
</script>

<template>
  <section v-if="recognition" class="proof section container" aria-labelledby="recognition-title">
    <div class="proof__intro">
      <h2 id="recognition-title" class="proof__heading">
        <UiAccentText :text="recognition.headline" />
      </h2>
      <UiStatement tag="span" :label="recognition.label" :text="recognition.statement" />
    </div>

    <div ref="block" class="proof__block">
      <!-- One card per award, stacked; the one on display shows -->
      <div class="proof__panel">
        <article
          v-for="(item, i) in recognition.items"
          :key="item.id"
          class="proof__card"
          :class="{ 'is-active': shown === i }"
          :aria-hidden="shown !== i || undefined"
          :inert="shown !== i || undefined"
        >
          <div class="proof__meta t-label">
            <span class="proof__type">{{ item.type }}</span>
            <span v-if="item.year" class="proof__year">{{ item.year }}</span>
          </div>
          <p class="proof__stat">{{ item.stat }}</p>
          <p class="proof__stat-label t-label">{{ item.statLabel }}</p>
          <p class="proof__detail">
            <span class="sr-only">{{ item.title }}: </span>{{ item.detail }}
          </p>
          <!-- Photos from the event, like prints pinned to a board; each opens full size -->
          <ul v-if="item.images?.length" role="list" class="proof__photos">
            <li v-for="(photo, p) in item.images" :key="photo.src" class="proof__photo">
              <a :href="photo.src" target="_blank" rel="noopener">
                <img
                  :src="photo.src.replace(/\.webp$/, '-thumb.webp')"
                  :alt="photo.alt"
                  :style="{ '--tilt': p % 2 ? '2.5deg' : '-2deg' }"
                  loading="lazy"
                  decoding="async"
                />
                <span class="sr-only"> (opens the full photo in a new tab)</span>
              </a>
            </li>
          </ul>
          <UiGlassButton v-if="item.project" :to="`/work/${item.project}`" variant="secondary">
            View project <span class="proof__arrow" aria-hidden="true">↳</span>
          </UiGlassButton>
        </article>
      </div>

      <UiStepList :items="titles" :active="active" focusable @show="shown = $event" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.proof {
  display: grid;
  gap: clamp(4rem, 10vw, 9rem);
}

.proof__intro {
  display: grid;
  gap: clamp(2.5rem, 5vw, 4.5rem);
}

// The section's title, large in the display serif; the accent word in violet italic
.proof__heading {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 10vw, 10rem);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.03em;
  color: var(--foreground);

  :deep(em) {
    color: var(--primary);
  }
}

.proof__block {
  display: grid;
  gap: 2.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 4rem;
    align-items: center;
  }
}

// ---------------------------------------------------------------- Award panel
// The cards share one grid cell, so the panel is as tall as the tallest
.proof__panel {
  display: grid;
}

.proof__card {
  grid-area: 1 / 1;
  display: grid;
  align-content: start;
  justify-items: start;
  gap: 0.9rem;
  pointer-events: none;

  > * {
    opacity: 0;
    transform: translateY(18px);
    filter: blur(6px);
    transition:
      opacity 0.35s var(--ease-out),
      transform 0.5s var(--ease-out),
      filter 0.35s var(--ease-out);
  }

  // The award on display: its parts rise in one after another
  &.is-active {
    pointer-events: auto;

    > * {
      opacity: 1;
      transform: none;
      filter: none;
    }

    @for $i from 1 through 6 {
      > :nth-child(#{$i}) {
        transition-delay: #{($i - 1) * 0.06}s;
      }
    }
  }
}

.proof__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--foreground-muted);
}

.proof__type {
  padding: 0.4em 0.85em;
  border: 1px solid color-mix(in srgb, var(--foreground) 22%, transparent);
  border-radius: 999px;
  color: var(--foreground);
}

.proof__stat {
  margin: 0.5rem 0 0;
  font-family: var(--font-display);
  font-size: clamp(4rem, 9vw, 9rem);
  line-height: 0.9;
  letter-spacing: -0.02em;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
}

.proof__stat-label {
  margin: 0;
  color: var(--foreground-muted);
}

.proof__detail {
  max-width: 30rem;
  margin: 0.75rem 0 0.5rem;
  font-size: clamp(1.05rem, 1.3vw, 1.25rem);
  line-height: 1.6;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
}

.proof__arrow {
  display: inline-block;
  margin-left: 0.35em;
}

// Event photos: small tilted prints at their own shape (no cropping), straightening and
// lifting under the pointer
.proof__photos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin: 0 0 0.75rem;
  padding: 0.35rem 0 0;
  list-style: none;
}

.proof__photo {
  a {
    display: block;
    border-radius: 0.75rem;

    &:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 4px;
    }
  }

  img {
    display: block;
    width: auto;
    max-width: min(100%, 22rem);
    height: clamp(6rem, 13svh, 9rem);
    object-fit: cover;
    border: 4px solid color-mix(in srgb, var(--foreground) 92%, transparent);
    border-radius: 0.75rem;
    box-shadow: 0 14px 30px -14px rgb(0 0 0 / 0.55);
    rotate: var(--tilt, 0deg);
    transition:
      rotate 0.5s var(--ease-out),
      translate 0.5s var(--ease-out),
      box-shadow 0.5s var(--ease-out);
  }

  a:hover img,
  a:focus-visible img {
    rotate: 0deg;
    translate: 0 -4px;
    box-shadow: 0 22px 40px -16px rgb(0 0 0 / 0.6);
  }
}

@media (max-width: 640px) {
  .proof__stat {
    font-size: 3.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .proof__card > * {
    transform: none;
    filter: none;
    transition: opacity 0.2s linear;
  }

  .proof__photo img {
    transition: none;
  }
}
</style>
