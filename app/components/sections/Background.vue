<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { siCisco, siHp } from 'simple-icons'

// Education and certifications ("Always learning"). On the home page it is a teaser linking to
// /about.
//
// Education is a timeline: a glowing line draws down as the visitor scrolls, and each stop's
// node lights up when the line reaches it; the cards slide in beside it with their years as a
// large outlined numeral. Certifications are holographic credential cards with the issuer's
// mark in its brand colour: they flip in like dealt cards, tilt under the pointer and catch a
// rainbow sheen where the pointer is. Without JavaScript or with reduced motion everything is
// simply shown.
withDefaults(defineProps<{ index?: number; teaser?: boolean }>(), { index: 5, teaser: true })

const { data: education } = await useEducation()

const timeline = ref<HTMLElement | null>(null)
const creds = ref<HTMLElement | null>(null)

interface Mark {
  /** Filled brand logo path, outline glyph path, or a short wordmark */
  path?: string
  outline?: boolean
  word?: string
  color: string
}

// Issuer marks: real logos where Simple Icons carries them (Cisco, HP); otherwise a glyph or
// wordmark in the brand's colour (Amazon, IBM and AICTE logos aren't in the set)
const ISSUERS: Record<string, Mark> = {
  'Amazon Web Services': {
    path: 'M7 18h10.5a4 4 0 0 0 .6-7.95A6.5 6.5 0 0 0 5.6 9.4 4.4 4.4 0 0 0 7 18z',
    outline: true,
    color: '#FF9900',
  },
  Cisco: { path: siCisco.path, color: `#${siCisco.hex}` },
  IBM: { word: 'IBM', color: '#0F62FE' },
  'EduSkills by AICTE': {
    path: 'M2.5 9 12 4.5 21.5 9 12 13.5zM6.5 11v4.5c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3V11M21.5 9v5.5',
    outline: true,
    color: '#7B61FF',
  },
  'HP LIFE': { path: siHp.path, color: `#${siHp.hex}` },
}
const fallback: Mark = { word: '✦', color: 'var(--primary)' }
const mark = (issuer: string) => ISSUERS[issuer] ?? fallback

// Education glyphs: a mortarboard for the degree, a book for school
const EDU_GLYPHS = [
  'M2.5 9 12 4.5 21.5 9 12 13.5zM6.5 11v4.5c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3V11M21.5 9v5.5',
  'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 21H20M8 7h8M8 10.5h6',
]

/** "2023–2026" → ["2023", "2026"] */
const years = (range: string) => range.split(/[–-]/).map((y) => y.trim())

// Credential cards: flip in, tilt and the holographic sheen (--mx/--my from useGlassCards)
useGlassCards(creds, {
  selector: '.cred',
  enter: (el, cards, manual) => {
    gsap.fromTo(
      cards,
      { rotateY: -75, transformOrigin: '0% 50%' },
      {
        rotateY: 0,
        duration: 1.2,
        stagger: 0.1,
        ease: 'expo.out',
        ...(manual ? {} : { scrollTrigger: { trigger: el, start: 'top 82%', once: true } }),
      }
    )
  },
})

let ctx: gsap.Context | null = null

onMounted(() => {
  const el = timeline.value
  if (!el) return
  // Reduced motion: every stop is simply lit
  if (prefersReducedMotion()) {
    el.querySelectorAll('.edu').forEach((stop) => stop.classList.add('is-lit'))
    return
  }
  ctx = gsap.context(() => {
    // The line draws down with scrolling
    gsap.fromTo(
      el.querySelector('.timeline__progress'),
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 70%', end: 'bottom 55%', scrub: 0.6 },
      }
    )
    // Each stop lights up as the line reaches it, and its card slides in
    for (const stop of el.querySelectorAll<HTMLElement>('.edu')) {
      gsap.fromTo(
        stop.querySelector('.edu__card'),
        { x: -40, autoAlpha: 0, filter: 'blur(8px)' },
        {
          x: 0,
          autoAlpha: 1,
          filter: 'blur(0px)',
          duration: 1,
          ease: 'expo.out',
          clearProps: 'filter',
          scrollTrigger: { trigger: stop, start: 'top 75%', once: true },
        }
      )
      // Lit once the line reaches it; unlit again only when scrolling back above it
      ScrollTrigger.create({
        trigger: stop.querySelector('.edu__node'),
        start: 'top 62%',
        onEnter: () => stop.classList.add('is-lit'),
        onLeaveBack: () => stop.classList.remove('is-lit'),
      })
    }
  }, el)
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <section v-if="education" class="background section container" aria-labelledby="background-title">
    <div class="section__head">
      <UiSectionLabel :index="index" label="Background" />
      <h2 id="background-title" v-reveal class="t-h2"><UiAccentText text="Always *learning*" /></h2>
    </div>

    <div class="background__grid">
      <!-- Education timeline -->
      <div>
        <h3 class="background__heading t-label">
          <span>Education</span>
          <span class="background__count">{{ projectNumber(education.education.length) }}</span>
        </h3>
        <div ref="timeline" class="timeline">
          <span class="timeline__track" aria-hidden="true">
            <span class="timeline__progress" />
          </span>
          <ol role="list" class="timeline__list">
            <li v-for="(e, i) in education.education" :key="e.item" class="edu">
              <span class="edu__node" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path :d="EDU_GLYPHS[i] ?? EDU_GLYPHS[0]" />
                </svg>
              </span>
              <div class="edu__card glass-card">
                <span class="edu__year" aria-hidden="true">{{ years(e.years)[0] }}</span>
                <p class="edu__years t-label">{{ e.years }}</p>
                <p class="edu__title">{{ e.item }}</p>
                <p class="edu__school">{{ e.institution }}</p>
                <p class="edu__note">{{ e.note }}</p>
              </div>
            </li>
          </ol>
        </div>
      </div>

      <!-- Credential cards -->
      <div>
        <h3 class="background__heading t-label">
          <span>Certifications</span>
          <span class="background__count">{{
            projectNumber(education.certifications.length)
          }}</span>
        </h3>
        <ul ref="creds" role="list" class="creds">
          <li
            v-for="(c, i) in education.certifications"
            :key="c.title"
            class="cred glass-card"
            :style="{ '--issuer': mark(c.issuer).color }"
          >
            <span class="cred__mark" aria-hidden="true">
              <svg
                v-if="mark(c.issuer).path"
                viewBox="0 0 24 24"
                focusable="false"
                :class="{ 'is-outline': mark(c.issuer).outline }"
              >
                <path :d="mark(c.issuer).path" />
              </svg>
              <span v-else class="cred__word">{{ mark(c.issuer).word }}</span>
            </span>
            <span class="cred__index t-label" aria-hidden="true">{{ projectNumber(i + 1) }}</span>
            <span class="cred__title">{{ c.title }}</span>
            <span class="cred__issuer t-label">{{ c.issuer }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="teaser" class="background__more">
      <UiGlassButton to="/about" variant="secondary">Read my story →</UiGlassButton>
    </div>
  </section>
</template>

<style scoped lang="scss">
.background__grid {
  display: grid;
  gap: 3.5rem 4rem;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  }
}

.background__heading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  color: var(--foreground-muted);

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(var(--foreground-rgb), 0.15);
  }
}

.background__count {
  color: var(--primary);
}

// ---------------------------------------------------------------- Timeline
.timeline {
  position: relative;
  padding-left: 3.75rem;
}

.timeline__list {
  display: grid;
  gap: 1.5rem;
}

// The track, and the glowing line that draws down it
.timeline__track {
  position: absolute;
  top: 1.4rem;
  bottom: 1.4rem;
  left: 1.35rem;
  width: 2px;
  border-radius: 2px;
  background: rgba(var(--foreground-rgb), 0.12);
}

.timeline__progress {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--primary);
  box-shadow: 0 0 14px 1px rgba(var(--primary-rgb), 0.7);
  transform-origin: top;
}

.edu {
  position: relative;
}

// The stop: a ring with its glyph, lit once the line reaches it
.edu__node {
  position: absolute;
  top: 1rem;
  left: -3.75rem;
  display: grid;
  place-items: center;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 50%;
  border: 1px solid rgba(var(--foreground-rgb), 0.2);
  background-color: rgba(var(--background-rgb), 0.85);
  color: var(--foreground-muted);
  transition:
    color 0.5s var(--ease-out),
    border-color 0.5s var(--ease-out),
    box-shadow 0.5s var(--ease-out),
    transform 0.5s var(--ease-out);

  svg {
    width: 55%;
    height: 55%;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .edu.is-lit & {
    color: var(--primary);
    border-color: var(--primary);
    box-shadow:
      0 0 0 6px rgba(var(--primary-rgb), 0.15),
      0 0 24px rgba(var(--primary-rgb), 0.55);
    transform: scale(1.06);
  }
}

.edu__card {
  display: grid;
  gap: 0.35rem;
  padding: clamp(1.25rem, 2.2vw, 1.75rem);
}

// The start year, a large outlined numeral behind the card's text
.edu__year {
  position: absolute;
  top: -0.12em;
  right: 0.2em;
  z-index: -1;
  font-family: var(--font-display);
  font-size: clamp(5rem, 9vw, 7.5rem);
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1px rgba(var(--primary-rgb), 0.35);
  pointer-events: none;
}

.edu__years {
  color: var(--primary);
}

.edu__title {
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  line-height: 1;
  text-transform: uppercase;
}

.edu__school {
  font-weight: 600;
}

.edu__note {
  color: var(--foreground-muted);
}

// ---------------------------------------------------------------- Credential cards
.creds {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
  gap: 1rem;
  perspective: 1200px;
}

.cred {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 0.9rem 0.75rem;
  min-height: 11rem;
  padding: 1.25rem;

  // Holographic sheen where the pointer is
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: inherit;
    opacity: 0;
    background: radial-gradient(
      18rem circle at var(--mx) var(--my),
      rgba(255, 120, 200, 0.22),
      rgba(120, 200, 255, 0.18) 35%,
      rgba(180, 255, 160, 0.12) 55%,
      transparent 70%
    );
    mix-blend-mode: screen;
    transition: opacity 0.4s var(--ease-out);
    pointer-events: none;
  }

  &:hover::after {
    opacity: 1;
  }

  // The issuer's colour edges the card on hover
  &:hover {
    border-color: color-mix(in srgb, var(--issuer) 60%, transparent);
    box-shadow: 0 1.5rem 4rem -1.5rem color-mix(in srgb, var(--issuer) 55%, transparent);
  }
}

// The issuer's mark in its brand colour, on a tile tinted with it
.cred__mark {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 0.9rem;
  border: 1px solid color-mix(in srgb, var(--issuer) 45%, transparent);
  background: color-mix(in srgb, var(--issuer) 14%, transparent);
  color: var(--issuer);
  transition: transform 0.5s var(--ease-out);

  svg {
    width: 58%;
    height: 58%;
    fill: currentColor;

    &.is-outline {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }

  .cred:hover & {
    transform: rotate(-8deg) scale(1.08);
  }
}

.cred__word {
  font-family: var(--font-display);
  font-size: 1.15rem;
  letter-spacing: 0.04em;
}

.cred__index {
  justify-self: end;
  align-self: start;
  color: var(--foreground-muted);
}

.cred__title {
  grid-column: 1 / -1;
  align-self: end;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.3;
}

.cred__issuer {
  grid-column: 1 / -1;
  color: var(--issuer);
}

// An odd last card takes the full row rather than sitting alone
@media (min-width: 640px) {
  .cred:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
}

.background__more {
  margin-top: 3rem;
}
</style>
