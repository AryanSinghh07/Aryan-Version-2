<script setup lang="ts">
import { gsap } from 'gsap'
import { siCisco, siHp } from 'simple-icons'

// "Always learning": education and certifications, in the language of the sections above it
// (a violet pill, the display serif, mono numbers on the plain page) but laid out differently,
// and without a pin.
//
// An editorial heading: "Always" on the left and "learning" on the line below at the right,
// drifting together as the section scrolls in, with a short intro beside them. Education is a
// ruled index: each row's line draws across and its text rises in. Certifications are clean
// tiles with the issuer's mark in its brand colour; they rise in one after another and glow in
// that colour under the pointer. Without JavaScript or with reduced motion everything is
// simply shown.

const { data: education } = await useEducation()

const root = ref<HTMLElement | null>(null)

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

const count = (n: number) => `(${String(n).padStart(2, '0')})`
const number = (i: number) => `(${String(i + 1).padStart(3, '0')})`

let ctx: gsap.Context | null = null

onMounted(() => {
  const el = root.value
  if (!el || prefersReducedMotion()) return
  ctx = gsap.context(() => {
    // The two words of the heading drift together as the section scrolls in
    const head = { trigger: '.learning__head', start: 'top 95%', end: 'top 25%', scrub: 0.8 }
    gsap.fromTo(
      '.learning__word--a',
      { xPercent: -14, opacity: 0.3 },
      { xPercent: 0, opacity: 1, ease: 'none', scrollTrigger: head }
    )
    gsap.fromTo(
      '.learning__word--b',
      { xPercent: 14, opacity: 0.3 },
      { xPercent: 0, opacity: 1, ease: 'none', scrollTrigger: head }
    )
    gsap.fromTo(
      '.learning__intro, .learning__tag',
      { y: 24, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 1,
        stagger: 0.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.learning__head', start: 'top 92%', once: true },
      }
    )

    // Education rows: the rule draws across, then the text rises in
    for (const row of el.querySelectorAll<HTMLElement>('.edu-row')) {
      gsap
        .timeline({ scrollTrigger: { trigger: row, start: 'top 95%', once: true } })
        .fromTo(
          row.querySelector('.edu-row__line'),
          { scaleX: 0 },
          { scaleX: 1, duration: 1.1, ease: 'expo.out' }
        )
        .fromTo(
          row.querySelectorAll('.edu-row__years, .edu-row__main, .edu-row__note'),
          { y: 32, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.08, ease: 'expo.out' },
          0.15
        )
    }

    // Certification tiles rise in one after another
    gsap.fromTo(
      '.cert',
      { y: 48, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 1,
        stagger: 0.08,
        ease: 'expo.out',
        clearProps: 'transform',
        scrollTrigger: { trigger: '.certs', start: 'top 95%', once: true },
      }
    )
  }, el)
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <section
    v-if="education"
    ref="root"
    class="learning section container"
    aria-labelledby="background-title"
  >
    <header class="learning__head">
      <span class="learning__tag t-label">{{ education.headline }}</span>
      <h2 id="background-title" class="learning__title">
        <span class="learning__word learning__word--a">Always</span>
        <span class="learning__word learning__word--b"><em>learning</em></span>
      </h2>
      <p class="learning__intro">{{ education.intro }}</p>
    </header>

    <!-- Education: a ruled index -->
    <div class="learning__group">
      <h3 class="learning__label t-label">
        Education <span class="learning__count">{{ count(education.education.length) }}</span>
      </h3>
      <ol role="list" class="edu-rows">
        <li v-for="e in education.education" :key="e.item" class="edu-row">
          <span class="edu-row__line" aria-hidden="true" />
          <span class="edu-row__years t-label">{{ e.years }}</span>
          <div class="edu-row__main">
            <p class="edu-row__title">{{ e.item }}</p>
            <p class="edu-row__school">{{ e.institution }}</p>
          </div>
          <p class="edu-row__note">{{ e.note }}</p>
        </li>
      </ol>
    </div>

    <!-- Certifications: tiles with the issuer's mark -->
    <div class="learning__group">
      <h3 class="learning__label t-label">
        Certifications
        <span class="learning__count">{{ count(education.certifications.length) }}</span>
      </h3>
      <ul role="list" class="certs">
        <li
          v-for="(c, i) in education.certifications"
          :key="c.title"
          class="cert"
          :style="{ '--issuer': mark(c.issuer).color }"
        >
          <div class="cert__top">
            <span class="cert__mark" aria-hidden="true">
              <svg
                v-if="mark(c.issuer).path"
                viewBox="0 0 24 24"
                focusable="false"
                :class="{ 'is-outline': mark(c.issuer).outline }"
              >
                <path :d="mark(c.issuer).path" />
              </svg>
              <span v-else class="cert__word">{{ mark(c.issuer).word }}</span>
            </span>
            <span class="cert__index t-label" aria-hidden="true">{{ number(i) }}</span>
          </div>
          <p class="cert__title">{{ c.title }}</p>
          <p class="cert__issuer t-label">{{ c.issuer }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped lang="scss">
.learning {
  display: grid;
  gap: clamp(4rem, 8vw, 7rem);
  // The heading's words slide in from beyond the sides: keep them from widening the page
  overflow-x: clip;
}

// ---------------------------------------------------------------- Heading
.learning__head {
  display: grid;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'tag tag'
      'title title'
      'intro .';
    column-gap: 3rem;

    .learning__tag {
      grid-area: tag;
    }

    .learning__title {
      grid-area: title;
    }

    .learning__intro {
      grid-area: intro;
    }
  }
}

.learning__tag {
  justify-self: start;
  padding: 0.45em 0.95em;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 0.8rem;
  line-height: 1.2;
}

.learning__title {
  display: grid;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(4rem, 13vw, 13rem);
  font-weight: 400;
  line-height: 0.88;
  letter-spacing: -0.03em;
  color: var(--foreground);
}

.learning__word {
  display: block;
  will-change: transform;
}

// "learning" sits on the line below, at the right, in violet italic
.learning__word--b {
  justify-self: end;

  em {
    color: var(--primary);
  }
}

.learning__intro {
  max-width: 24rem;
  margin: 0;
  font-size: clamp(1rem, 1.2vw, 1.15rem);
  line-height: 1.6;
  color: color-mix(in srgb, var(--foreground) 70%, transparent);

  @media (min-width: 1024px) {
    // Up beside "learning"
    margin-top: calc(clamp(4rem, 13vw, 13rem) * -0.85);
  }
}

// ---------------------------------------------------------------- Group labels
.learning__group {
  display: grid;
  gap: 1.5rem;
}

.learning__label {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  justify-self: start;
  margin: 0;
  padding: 0.45em 0.95em;
  border: 1px solid color-mix(in srgb, var(--primary) 55%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--foreground);
  font-size: 0.8rem;
  line-height: 1.2;
}

.learning__count {
  color: var(--foreground-muted);
}

// ---------------------------------------------------------------- Education index
.edu-rows {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 14%, transparent);
}

.edu-row {
  position: relative;
  display: grid;
  gap: 0.75rem;
  padding: clamp(1.5rem, 3vw, 2.5rem) 0;

  @media (min-width: 900px) {
    grid-template-columns: 11rem minmax(0, 1.3fr) minmax(0, 1fr);
    align-items: baseline;
    gap: 2rem;
  }
}

// The rule above each row, drawn across as the row arrives
.edu-row__line {
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: color-mix(in srgb, var(--foreground) 14%, transparent);
  transform-origin: left;
}

.edu-row__years {
  color: var(--foreground-muted);
  font-variant-numeric: tabular-nums;
  transition: color 0.4s var(--ease-out);
}

.edu-row__title {
  margin: 0;
  font-size: clamp(1.5rem, 2.6vw, 2.6rem);
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--foreground);
  transition: transform 0.5s var(--ease-out);
}

.edu-row__school {
  margin: 0.4rem 0 0;
  color: color-mix(in srgb, var(--foreground) 60%, transparent);
}

.edu-row__note {
  margin: 0;
  line-height: 1.6;
  color: color-mix(in srgb, var(--foreground) 60%, transparent);

  @media (min-width: 900px) {
    text-align: right;
  }
}

.edu-row:hover {
  .edu-row__years {
    color: var(--primary);
  }

  .edu-row__title {
    transform: translateX(10px);
  }
}

// ---------------------------------------------------------------- Certification tiles
.certs {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (min-width: 1100px) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.cert {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 13rem;
  padding: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, transparent);
  border-radius: 1.25rem;
  background: color-mix(in srgb, var(--foreground) 3%, transparent);
  transition:
    transform 0.5s var(--ease-out),
    border-color 0.4s var(--ease-out),
    background-color 0.4s var(--ease-out),
    box-shadow 0.5s var(--ease-out);

  &:hover {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--issuer) 60%, transparent);
    background-color: color-mix(in srgb, var(--issuer) 8%, transparent);
    box-shadow: 0 18px 40px -20px color-mix(in srgb, var(--issuer) 55%, transparent);
  }
}

.cert__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: auto;
  padding-bottom: 1.5rem;
}

.cert__mark {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.8rem;
  background: color-mix(in srgb, var(--issuer) 14%, transparent);
  color: var(--issuer);

  svg {
    width: 58%;
    height: 58%;
    fill: currentColor;

    &.is-outline {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }
}

.cert__word {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.cert__index {
  color: var(--foreground-muted);
}

.cert__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--foreground);
}

.cert__issuer {
  margin: 0;
  color: var(--foreground-muted);
}

@media (prefers-reduced-motion: reduce) {
  .cert,
  .edu-row__title,
  .edu-row__years {
    transition: none;
  }
}
</style>
