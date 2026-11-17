<script setup lang="ts">
import { gsap } from 'gsap'

// The stack: a headline with live counts, two logo walls drifting in opposite directions, and
// a glass card per area (frontend, backend, AI / ML, DevOps) with its glyph, a one-line blurb
// and a tile for every tool. Logos sit in the text colour and light up in the brand's own
// colour on hover. Motion: cards rise in (useGlassCards), area glyphs draw themselves, tiles
// pop in one after another and the counts tick up. Reduced motion: everything simply shows.
const { data: stack } = await useStack()

const areas = ref<HTMLElement | null>(null)

const tools = computed(() => stack.value?.groups.flatMap((g) => g.tools) ?? [])
// Two walls: the first half of the tools on top, the rest below
const walls = computed(() => {
  const all = tools.value
  const half = Math.ceil(all.length / 2)
  return [all.slice(0, half), all.slice(half)]
})

useGlassCards(areas, {
  selector: '.area',
  onMount: (el) => {
    const section = el.closest('section') ?? el
    // Area glyphs draw their outline, then fill in their colour
    for (const path of el.querySelectorAll<SVGPathElement>('.area__glyph path')) {
      const length = path.getTotalLength()
      gsap.fromTo(
        path,
        { strokeDasharray: length, strokeDashoffset: length },
        {
          strokeDashoffset: 0,
          duration: 1.6,
          ease: 'power2.inOut',
          clearProps: 'strokeDasharray,strokeDashoffset',
          scrollTrigger: { trigger: path, start: 'top 88%', once: true },
        }
      )
    }

    // Tool tiles pop in, one after another within each card
    for (const card of el.querySelectorAll<HTMLElement>('.area')) {
      // fromTo with explicit end values: a second set-up (remount) can never capture the
      // hidden starting state as the "final" one
      gsap.fromTo(
        card.querySelectorAll('.tool'),
        { y: 18, scale: 0.6, rotate: -6, autoAlpha: 0 },
        {
          y: 0,
          scale: 1,
          rotate: 0,
          autoAlpha: 1,
          duration: 0.7,
          stagger: 0.035,
          ease: 'back.out(2)',
          delay: 0.25,
          clearProps: 'transform',
          scrollTrigger: { trigger: card, start: 'top 82%', once: true },
        }
      )
    }

    // The counts tick up
    for (const n of section.querySelectorAll<HTMLElement>('[data-count]')) {
      const target = Number(n.dataset.count)
      const pad = n.dataset.pad === 'true'
      const counter = { v: 0 }
      const show = () => {
        const v = Math.round(counter.v)
        n.textContent = pad ? projectNumber(v) : String(v)
      }
      show()
      gsap.to(counter, {
        v: target,
        duration: 1.4,
        ease: 'power3.out',
        onUpdate: show,
        scrollTrigger: { trigger: n, start: 'top 90%', once: true },
      })
    }
  },
})
</script>

<template>
  <section v-if="stack" class="stack section container" aria-labelledby="stack-title">
    <div class="stack__head">
      <div class="section__head">
        <UiSectionLabel :index="2" label="Stack" />
        <h2 id="stack-title" v-reveal class="t-h2"><UiAccentText :text="stack.headline" /></h2>
      </div>

      <dl class="stack__facts">
        <div class="stack__fact">
          <dt class="t-label">Tools</dt>
          <dd>
            <span class="sr-only">{{ tools.length }}</span>
            <span aria-hidden="true" :data-count="tools.length">{{ tools.length }}</span>
          </dd>
        </div>
        <div class="stack__fact">
          <dt class="t-label">Areas</dt>
          <dd>
            <span class="sr-only">{{ stack.groups.length }}</span>
            <span aria-hidden="true" :data-count="stack.groups.length">{{
              stack.groups.length
            }}</span>
          </dd>
        </div>
      </dl>
    </div>

    <!-- Decorative: every tool is listed with its name in the cards below -->
    <div class="walls" aria-hidden="true">
      <div v-for="(wall, w) in walls" :key="w" class="wall" :class="{ 'wall--reverse': w === 1 }">
        <div class="wall__track">
          <template v-for="copy in 2" :key="copy">
            <span v-for="tool in wall" :key="`${copy}-${tool}`" class="wall__logo">
              <UiTechIcon :name="tool" />
              <span>{{ tool }}</span>
            </span>
          </template>
        </div>
      </div>
    </div>

    <ol ref="areas" role="list" class="areas">
      <li v-for="(group, i) in stack.groups" :key="group.title" class="area glass-card">
        <div class="area__top">
          <svg class="area__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path :d="AREA_ICONS[group.icon]" />
          </svg>
          <span class="area__index t-label">{{ projectNumber(i + 1) }}</span>
          <span class="area__count t-label">
            <span aria-hidden="true" :data-count="group.tools.length" data-pad="true">{{
              projectNumber(group.tools.length)
            }}</span>
            <span class="sr-only">{{ group.tools.length }}</span>
            tools
          </span>
        </div>

        <h3 class="area__title">{{ group.title }}</h3>
        <p class="area__blurb">{{ group.blurb }}</p>

        <ul role="list" class="tools">
          <li v-for="tool in group.tools" :key="tool" class="tool">
            <UiTechIcon :name="tool" />
            <span class="tool__name">{{ tool }}</span>
          </li>
        </ul>
      </li>
    </ol>
  </section>
</template>

<style scoped lang="scss">
.stack {
  display: grid;
  gap: clamp(2.5rem, 5vw, 4rem);
}

.stack__head {
  display: grid;
  gap: 2rem;
  align-items: end;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1fr) auto;

    .section__head {
      margin-bottom: 0;
    }
  }
}

.stack__facts {
  display: flex;
  gap: clamp(1.5rem, 4vw, 3rem);
}

.stack__fact {
  display: grid;
  gap: 0.25rem;

  dt {
    color: var(--foreground-muted);
  }

  dd {
    font-family: var(--font-display);
    font-size: clamp(3rem, 6vw, 4.5rem);
    line-height: 0.9;
    color: var(--primary);
    font-variant-numeric: tabular-nums;
  }
}

// ---------------------------------------------------------------- Logo walls
.walls {
  display: grid;
  gap: 0.75rem;
  // Fade the logos in and out at the edges
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
}

.wall {
  overflow: hidden;
}

.wall__track {
  display: flex;
  gap: 0.75rem;
  width: max-content;
  animation: wall-drift 55s linear infinite;

  .wall--reverse & {
    animation-direction: reverse;
    animation-duration: 65s;
  }

  // Hovering a wall pauses it, so a logo can be read
  .wall:hover & {
    animation-play-state: paused;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}

@keyframes wall-drift {
  to {
    transform: translateX(calc(-50% - 0.375rem));
  }
}

.wall__logo {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1.1rem;
  border: 1px solid rgba(var(--foreground-rgb), 0.1);
  border-radius: 999px;
  background-color: rgba(var(--background-rgb), 0.5);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  color: var(--foreground-muted);
  font-size: 0.95rem;
  white-space: nowrap;
  transition:
    color 0.3s var(--ease-out),
    border-color 0.3s var(--ease-out);

  &:hover {
    color: var(--foreground);
    border-color: rgba(var(--primary-rgb), 0.45);

    :deep(.tech-icon) {
      color: var(--brand);
      transform: scale(1.15);
    }
  }
}

// ---------------------------------------------------------------- Area cards
.areas {
  display: grid;
  gap: 1rem;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
  }
}

.area {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: clamp(1.25rem, 2.2vw, 2rem);
}

.area__top {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-bottom: 0.5rem;
}

// The area's glyph in a tinted rounded square
.area__glyph {
  width: 3rem;
  height: 3rem;
  padding: 0.7rem;
  border-radius: 0.9rem;
  background: rgba(var(--primary-rgb), 0.14);
  border: 1px solid rgba(var(--primary-rgb), 0.3);
  fill: none;
  stroke: var(--primary);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.5s var(--ease-out);

  .area:hover & {
    transform: rotate(-8deg) scale(1.06);
  }
}

.area__index {
  color: var(--primary);
}

.area__count {
  margin-left: auto;
  color: var(--foreground-muted);
  font-variant-numeric: tabular-nums;
}

.area__title {
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 3.5vw, 3rem);
  font-weight: 400;
  line-height: 0.95;
  text-transform: uppercase;
}

.area__blurb {
  max-width: 30rem;
  color: var(--foreground-muted);
}

.tools {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.tool {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.8rem;
  border: 1px solid rgba(var(--foreground-rgb), 0.1);
  border-radius: 0.9rem;
  background-color: rgba(var(--foreground-rgb), 0.03);
  transition:
    transform 0.35s var(--ease-out),
    border-color 0.35s var(--ease-out),
    background-color 0.35s var(--ease-out);

  :deep(.tech-icon) {
    width: 1.35rem;
    height: 1.35rem;
    opacity: 0.85;
  }

  // The logo lights up in its brand colour
  &:hover {
    transform: translateY(-3px);
    border-color: rgba(var(--primary-rgb), 0.45);
    background-color: rgba(var(--primary-rgb), 0.08);

    :deep(.tech-icon) {
      color: var(--brand);
      opacity: 1;
      transform: scale(1.18) rotate(-6deg);
    }
  }
}

.tool__name {
  font-size: 0.92rem;
  line-height: 1.2;
}
</style>
