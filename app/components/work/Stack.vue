<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { SplitText } from 'gsap/SplitText'
import type { ProjectsCollectionItem } from '@nuxt/content'

// The projects as big cards that stack up as you scroll. The stage holds still while each
// next card slides up over the one before; the cards underneath shrink back and dim, their top
// edges peeking out like a deck. As a card arrives its title rises letter by letter, its
// details follow and its image settles from a zoom. A rolling counter shows which one is in
// front.
//
// On small or short screens, with reduced motion, and without JavaScript the cards are a plain
// list (each one reveals as it scrolls in, unless motion is reduced).
const props = defineProps<{ projects: ProjectsCollectionItem[] }>()

const root = ref<HTMLElement | null>(null)
const stacked = ref(false)
const count = computed(() => props.projects.length)

const colorOf = (p: ProjectsCollectionItem) =>
  DOMAIN_COLORS[p.domain as Domain] ?? DOMAIN_COLORS['Full Stack']

/** Room for each card to arrive, in screen heights, and a short hold after the last one */
const STEP = 0.9
const HOLD = 0.35

let mm: gsap.MatchMedia | null = null
let splits: SplitText[] = []

onMounted(async () => {
  const el = root.value
  if (!el || prefersReducedMotion()) return
  await document.fonts.ready
  if (!root.value) return

  const cards = [...el.querySelectorAll<HTMLElement>('.card')]
  const titles = [...el.querySelectorAll<HTMLElement>('.card__title')]
  splits = titles.map((t) => splitText(t))
  const chars = titles.map((t) => [...t.querySelectorAll<HTMLElement>(`.${textClasses.char}`)])
  const details = cards.map((c) => [...c.querySelectorAll<HTMLElement>('.card__reveal')])
  const images = cards.map(
    (c) =>
      c.querySelector<HTMLElement>('.card__img') ?? c.querySelector<HTMLElement>('.card__media')!
  )
  const shades = cards.map((c) => c.querySelector<HTMLElement>('.card__shade'))
  const track = el.querySelector<HTMLElement>('.stack__count-track')
  const bar = el.querySelector<HTMLElement>('.stack__bar-fill')

  mm = gsap.matchMedia()

  // Big screens: the stage holds and the cards stack
  mm.add('(min-width: 900px) and (min-height: 620px)', () => {
    stacked.value = true
    el.style.setProperty('--steps', String((cards.length - 1) * STEP + HOLD))

    gsap.set(cards.slice(1), { yPercent: 118 })
    gsap.set(chars.slice(1).flat(), { yPercent: 110 })
    gsap.set(details.slice(1).flat(), { autoAlpha: 0, y: 28 })
    gsap.set(images.slice(1), { scale: 1.3 })

    // The first card's title rises as the stage comes into view
    gsap
      .timeline({ scrollTrigger: { trigger: el, start: 'top 65%', once: true } })
      .from(chars[0]!, {
        yPercent: 110,
        duration: 1.1,
        stagger: 0.018,
        ease: 'expo.out',
      })
      .from(
        details[0]!,
        { autoAlpha: 0, y: 28, duration: 0.9, stagger: 0.06, ease: 'expo.out' },
        0.2
      )
      .from(images[0]!, { scale: 1.3, duration: 1.6, ease: 'expo.out' }, 0)

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.8 },
    })
    cards.forEach((card, k) => {
      if (k === 0) return
      const at = (k - 1) * STEP
      tl.to(card, { yPercent: 0, duration: STEP, ease: 'power2.inOut' }, at)
      tl.to(images[k]!, { scale: 1.06, duration: STEP, ease: 'power2.out' }, at)
      // The cards underneath shrink back and dim, the furthest the most
      for (let j = 0; j < k; j++) {
        const depth = k - j
        tl.to(cards[j]!, { scale: 1 - depth * 0.045, duration: STEP, ease: 'power2.inOut' }, at)
        tl.to(shades[j]!, { opacity: Math.min(0.35 + (depth - 1) * 0.2, 0.85), duration: STEP }, at)
      }
      tl.to(
        chars[k]!,
        { yPercent: 0, duration: STEP * 0.5, stagger: 0.012, ease: 'power3.out' },
        at + STEP * 0.4
      )
      tl.to(
        details[k]!,
        { autoAlpha: 1, y: 0, duration: STEP * 0.4, stagger: 0.04, ease: 'power2.out' },
        at + STEP * 0.55
      )
      if (track)
        tl.to(
          track,
          { yPercent: (-100 * k) / cards.length, duration: STEP * 0.35, ease: 'power2.inOut' },
          at + STEP * 0.4
        )
    })
    if (bar)
      tl.fromTo(
        bar,
        { scaleX: 1 / cards.length },
        { scaleX: 1, duration: (cards.length - 1) * STEP },
        0
      )
    tl.to({}, { duration: HOLD })

    return () => {
      stacked.value = false
      el.style.removeProperty('--steps')
    }
  })

  // Small screens: each card reveals as it scrolls in
  mm.add('(max-width: 899px), (max-height: 619px)', () => {
    cards.forEach((card, k) => {
      gsap
        .timeline({ scrollTrigger: { trigger: card, start: 'top 80%', once: true } })
        .from(images[k]!, { scale: 1.3, duration: 1.4, ease: 'expo.out' }, 0)
        .from(chars[k]!, { yPercent: 110, duration: 1, stagger: 0.015, ease: 'expo.out' }, 0.1)
        .from(
          details[k]!,
          { autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.06, ease: 'expo.out' },
          0.25
        )
    })
  })

  // The layout changed: everything below measures again
  requestAnimationFrame(() => ScrollTrigger.refresh())
})

onBeforeUnmount(() => {
  mm?.revert()
  splits.forEach((s) => s.revert())
  splits = []
})
</script>

<template>
  <section
    ref="root"
    class="stack"
    :class="{ 'is-stacked': stacked }"
    :style="{ '--count': count }"
    aria-labelledby="stack-title"
  >
    <div class="stack__stage">
      <div class="stack__head container">
        <h2 id="stack-title" class="stack__label t-label">
          <span class="stack__label-dot" aria-hidden="true" />Case studies
        </h2>
        <div class="stack__progress" aria-hidden="true">
          <span class="stack__count t-label">
            <span class="stack__count-window">
              <span class="stack__count-track">
                <span v-for="(p, i) in projects" :key="p.slug">{{ projectNumber(i + 1) }}</span>
              </span>
            </span>
            <span class="t-muted">/ {{ projectNumber(count) }}</span>
          </span>
          <span class="stack__bar"><span class="stack__bar-fill" /></span>
        </div>
      </div>

      <ol role="list" class="stack__cards container">
        <li
          v-for="(p, i) in projects"
          :key="p.slug"
          class="card"
          :style="{ '--i': i, '--tint': colorOf(p) }"
        >
          <div class="card__inner">
            <div class="card__text">
              <span class="card__ghost" aria-hidden="true">{{ projectNumber(i + 1) }}</span>
              <div class="card__meta card__reveal">
                <span class="t-label t-muted">({{ projectNumber(i + 1) }})</span>
                <span class="card__pill t-label">
                  <i class="card__dot" aria-hidden="true" />{{ p.domain }}
                </span>
                <span class="card__year t-label t-muted">{{ p.year }}</span>
              </div>

              <h3 class="card__title">
                <NuxtLink :to="`/work/${p.slug}`" class="card__title-link">{{ p.title }}</NuxtLink>
              </h3>

              <p class="card__summary card__reveal">{{ p.summary }}</p>

              <ul v-if="p.results?.length" role="list" class="card__results card__reveal">
                <li v-for="r in (p.results ?? []).slice(0, 2)" :key="r">
                  <span aria-hidden="true">↳</span> {{ r }}
                </li>
              </ul>

              <div class="card__foot card__reveal">
                <ul role="list" class="card__chips">
                  <li v-for="s in p.stack.slice(0, 4)" :key="s" class="t-label">{{ s }}</li>
                </ul>
                <NuxtLink
                  :to="`/work/${p.slug}`"
                  class="card__cta"
                  tabindex="-1"
                  aria-hidden="true"
                >
                  <span>View case</span>
                  <span class="card__cta-arrow">↗</span>
                </NuxtLink>
              </div>
            </div>

            <NuxtLink
              :to="`/work/${p.slug}`"
              class="card__media"
              data-cursor="View"
              tabindex="-1"
              aria-hidden="true"
            >
              <img
                v-if="p.cover"
                class="card__img"
                :src="p.cover"
                :alt="''"
                :loading="i < 2 ? 'eager' : 'lazy'"
                decoding="async"
              />
              <span class="card__media-tag t-label">{{ p.subtitle }}</span>
            </NuxtLink>
          </div>
          <span class="card__shade" aria-hidden="true" />
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped lang="scss">
:global([data-theme='light'] .stack) {
  --card-shadow: rgba(40, 20, 80, 0.12);
}

.stack {
  --head: clamp(5.5rem, 11vh, 7rem);

  position: relative;
  padding-block: clamp(4rem, 10vw, 8rem);
}

.stack__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}

.stack__label {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
  font-size: 0.8rem;
}

.stack__label-dot {
  width: 0.5rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.2);
  animation: stack-pulse 2s ease-in-out infinite;
}

@keyframes stack-pulse {
  50% {
    box-shadow: 0 0 0 8px rgba(var(--primary-rgb), 0);
  }
}

.stack__progress {
  display: none;
  align-items: center;
  gap: 1rem;
}

.stack__count {
  display: inline-flex;
  gap: 0.4em;
  font-variant-numeric: tabular-nums;
}

// The counter rolls from one number to the next
.stack__count-window {
  display: inline-block;
  height: 1.2em;
  overflow: hidden;
  line-height: 1.2;
}

.stack__count-track {
  display: grid;
}

.stack__bar {
  position: relative;
  width: clamp(6rem, 12vw, 10rem);
  height: 1px;
  background: color-mix(in srgb, var(--foreground) 18%, transparent);
}

.stack__bar-fill {
  position: absolute;
  inset: 0;
  background: var(--primary);
  transform-origin: 0 50%;
}

.stack__cards {
  display: grid;
  gap: 2rem;
}

// ── A card ────────────────────────────────────────────────────────────────────────────
.card {
  position: relative;
  border-radius: clamp(1.25rem, 2vw, 2rem);
  transform-origin: 50% 0;
}

.card__inner {
  position: relative;
  display: grid;
  gap: 1.75rem;
  height: 100%;
  padding: clamp(1.25rem, 2.6vw, 2.5rem);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
  border-radius: inherit;
  background:
    radial-gradient(
      90% 70% at 100% 0%,
      color-mix(in srgb, var(--tint) 16%, transparent),
      transparent 65%
    ),
    radial-gradient(
      60% 60% at 0% 100%,
      color-mix(in srgb, var(--primary) 10%, transparent),
      transparent 70%
    ),
    color-mix(in srgb, var(--foreground) 4%, var(--page-bg));
  box-shadow: 0 -1.5rem 4rem -1rem var(--card-shadow, rgba(0, 0, 0, 0.45));

  // A thin line of the domain colour along the top
  &::before {
    content: '';
    position: absolute;
    inset: 0 10% auto;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--tint), transparent);
    opacity: 0.8;
  }
}

// Darkens a card as others stack over it
.card__shade {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--page-bg);
  opacity: 0;
  pointer-events: none;
}

.card__text {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  min-width: 0;
}

// A huge outlined number behind the text
.card__ghost {
  position: absolute;
  right: -0.05em;
  bottom: -0.2em;
  z-index: -1;
  font-family: var(--font-display);
  font-size: clamp(10rem, 22vw, 22rem);
  line-height: 0.8;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in srgb, var(--tint) 35%, transparent);
  opacity: 0.6;
  pointer-events: none;
}

.card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.card__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.35em 0.85em;
  border: 1px solid color-mix(in srgb, var(--tint) 45%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--tint) 10%, transparent);
  font-size: 0.7rem;
}

.card__dot {
  width: 0.5em;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--tint);
  box-shadow: 0 0 10px var(--tint);
}

.card__year {
  margin-left: auto;
}

.card__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 4vw, 4.5rem);
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.card__title-link {
  transition: color 0.3s ease;

  &:hover {
    color: var(--primary);
  }
}

.card__summary {
  max-width: 36rem;
  margin: 0;
  color: var(--foreground-muted);
  font-size: clamp(0.95rem, 1.05vw, 1.05rem);
  line-height: 1.55;
}

.card__results {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  font-size: 0.95rem;

  span {
    color: var(--primary);
    margin-right: 0.25em;
  }
}

.card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;
  padding-top: 0.5rem;
}

.card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;

  li {
    padding: 0.4em 0.8em;
    border: 1px solid color-mix(in srgb, var(--foreground) 14%, transparent);
    border-radius: 999px;
    font-size: 0.65rem;
  }
}

.card__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75em 0.75em 0.75em 1.25em;
  border-radius: 999px;
  background: var(--foreground);
  color: var(--page-bg);
  font-size: 0.9rem;
  font-weight: 500;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;

  &:hover {
    background: var(--primary);
    color: #fff;
  }
}

.card__cta-arrow {
  display: grid;
  place-items: center;
  width: 1.8em;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--page-bg);
  color: var(--foreground);
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);

  .card__cta:hover & {
    transform: rotate(45deg);
  }
}

.card__media {
  position: relative;
  display: block;
  min-height: 14rem;
  overflow: hidden;
  border-radius: clamp(0.9rem, 1.4vw, 1.25rem);
  background: color-mix(in srgb, var(--foreground) 6%, transparent);
  aspect-ratio: 16 / 10;

  @media (max-width: 899px) {
    order: -1;
  }
}

.card__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: 50% 50%;
  transition: filter 0.6s ease;

  .card__media:hover & {
    filter: saturate(1.15) brightness(1.05);
  }
}

.card__media-tag {
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  padding: 0.45em 0.9em;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 0.65rem;
}

// ── Big screens: the stage holds and the cards stack ────────────────────────────────
@media (min-width: 900px) {
  .card__inner {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: clamp(1.5rem, 3vw, 3rem);
  }

  .card__media {
    aspect-ratio: auto;
  }
}

.stack.is-stacked {
  height: calc(100svh + var(--steps) * 100svh);
  padding-block: 0;

  .stack__stage {
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    height: 100svh;
    padding-top: var(--head);
    padding-bottom: 1.5rem;
    overflow: hidden;
  }

  .stack__head {
    margin-bottom: 1.25rem;
  }

  .stack__progress {
    display: inline-flex;
  }

  .stack__cards {
    position: relative;
    flex: 1;
    display: block;
  }

  .card {
    position: absolute;
    top: calc(var(--i) * 0.85rem);
    right: var(--container-pad, max(1rem, 4vw));
    bottom: calc((var(--count) - 1 - var(--i)) * 0.85rem);
    left: var(--container-pad, max(1rem, 4vw));
    will-change: transform;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stack__label-dot {
    animation: none;
  }
}
</style>
