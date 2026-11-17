<script setup lang="ts">
import { gsap } from 'gsap'

// Recognition as a bento grid of glass cards. The first award is the wide feature card; each
// card leads with its stat ("34th", "2,000+"), counting up as the grid scrolls in, with the
// award's type, year (also as a large outlined watermark), title, detail and a link to the
// related project. Card motion (rise in, tilt and spotlight) comes from useGlassCards.
const { data: recognition } = await useRecognition()

const grid = ref<HTMLElement | null>(null)

/** "2,000+" → { prefix: '', value: 2000, suffix: '+', grouped: true }; words don't count */
function parseStat(stat: string) {
  const m = stat.match(/^(\D*)([\d,]+)(\D*)$/)
  if (!m) return null
  return {
    prefix: m[1] ?? '',
    value: Number(m[2]!.replace(/,/g, '')),
    suffix: m[3] ?? '',
    grouped: m[2]!.includes(','),
  }
}

useGlassCards(grid, {
  // Numeric stats count up as they arrive
  onMount: (root) => {
    for (const el of root.querySelectorAll<HTMLElement>('[data-stat]')) {
      const stat = parseStat(el.dataset.stat ?? '')
      if (!stat) continue
      const counter = { n: 0 }
      const format = (n: number) =>
        `${stat.prefix}${stat.grouped ? Math.round(n).toLocaleString('en-US') : Math.round(n)}${stat.suffix}`
      el.textContent = format(0)
      gsap.to(counter, {
        n: stat.value,
        duration: 1.6,
        ease: 'power3.out',
        onUpdate: () => (el.textContent = format(counter.n)),
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      })
    }
  },
})
</script>

<template>
  <section
    v-if="recognition"
    class="recognition section container"
    aria-labelledby="recognition-title"
  >
    <div class="section__head">
      <UiSectionLabel :index="4" label="Recognition" />
      <h2 id="recognition-title" v-reveal class="t-h2">
        <UiAccentText :text="recognition.headline" />
      </h2>
    </div>

    <ol ref="grid" role="list" class="awards">
      <li
        v-for="(item, i) in recognition.items"
        :key="item.id"
        class="award glass-card"
        :class="{ 'award--feature glass-card--tint': i === 0 }"
      >
        <img v-if="item.images?.[0]" :src="item.images?.[0]" alt="" class="award__image" />
        <span v-if="item.year" class="award__watermark" aria-hidden="true">{{ item.year }}</span>

        <div class="award__top">
          <span class="award__index t-label">{{ projectNumber(i + 1) }}</span>
          <UiTag :variant="i === 0 ? 'accent' : 'outline'">{{ item.type }}</UiTag>
          <span v-if="item.year" class="award__year t-label">{{ item.year }}</span>
        </div>

        <div class="award__stat">
          <!-- The counter is decorative while it counts; screen readers get the final value -->
          <span class="sr-only">{{ item.stat }}</span>
          <span class="award__value" :data-stat="item.stat" aria-hidden="true">{{
            item.stat
          }}</span>
          <span class="award__stat-label t-label">{{ item.statLabel }}</span>
        </div>

        <div class="award__body">
          <h3 class="award__title">{{ item.title }}</h3>
          <p class="award__detail">{{ item.detail }}</p>
          <NuxtLink v-if="item.project" :to="`/work/${item.project}`" class="award__link t-label">
            View project <span aria-hidden="true">→</span>
          </NuxtLink>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped lang="scss">
// Bento grid: the wide feature card and one more on the first row, three below
.awards {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 1.25rem;
  }
}

.award {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  min-height: 17rem;
  padding: clamp(1.25rem, 2vw, 1.75rem);

  @media (min-width: 1024px) {
    grid-column: span 2;
  }
}

.award--feature {
  @media (min-width: 768px) {
    grid-column: span 2;
  }

  @media (min-width: 1024px) {
    grid-column: span 4;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    column-gap: 2.5rem;

    .award__top {
      grid-column: 1 / -1;
    }

    .award__stat {
      align-self: end;
    }

    .award__body {
      align-self: end;
    }
  }
}

// Optional proof photo behind the feature card
.award__image {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.35;
}

// The year as a large outlined watermark in the corner
.award__watermark {
  position: absolute;
  right: -0.06em;
  bottom: -0.2em;
  z-index: -1;
  font-family: var(--font-display);
  font-size: clamp(6rem, 12vw, 10rem);
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1px rgba(var(--foreground-rgb), 0.12);
  pointer-events: none;
  user-select: none;

  .award--feature & {
    font-size: clamp(8rem, 16vw, 14rem);
  }
}

.award__top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.award__index {
  color: var(--primary);
}

.award__year {
  margin-left: auto;
  color: var(--foreground-muted);
}

.award__stat {
  display: grid;
  gap: 0.5rem;
  transform: translateZ(30px);
}

.award__value {
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 6vw, 5rem);
  line-height: 0.85;
  text-transform: uppercase;
  color: var(--primary);
  font-variant-numeric: tabular-nums;

  .award--feature & {
    font-size: clamp(5rem, 9vw, 8.5rem);
  }
}

.award__stat-label {
  color: var(--foreground-muted);
}

.award__body {
  display: grid;
  gap: 0.6rem;
  margin-top: auto;
  transform: translateZ(20px);
}

.award__title {
  font-size: clamp(1.25rem, 1.6vw, 1.5rem);
  font-weight: 600;
  line-height: 1.2;

  .award--feature & {
    font-size: clamp(1.6rem, 2.4vw, 2.25rem);
  }
}

.award__detail {
  max-width: 34rem;
  color: var(--foreground-muted);
}

.award__link {
  justify-self: start;
  margin-top: 0.4rem;
  color: var(--foreground);
  border-bottom: 1px solid rgba(var(--foreground-rgb), 0.3);
  transition:
    color 0.3s var(--ease-out),
    border-color 0.3s var(--ease-out);

  span {
    display: inline-block;
    transition: transform 0.3s var(--ease-out);
  }

  &:hover,
  &:focus-visible {
    color: var(--primary);
    border-color: var(--primary);

    span {
      transform: translateX(0.3em);
    }
  }
}
</style>
