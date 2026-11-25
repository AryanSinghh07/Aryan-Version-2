<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { siCisco, siHp } from 'simple-icons'

// "Always learning": education and certifications, in the language of the sections above it
// (a violet pill, the display serif, mono numbers on the plain page) but laid out differently.
//
// An editorial heading: "Always" on the left and "learning" on the line below at the right,
// drifting together as the section scrolls in, with a short intro beside them. Education is a
// ruled index: each row's line draws across and its text rises in. Certifications are a
// horizontal showcase of the certificates themselves (image, issuer's mark in its brand colour,
// credential ID), each card opening its verification page: on big screens the row holds the
// screen and slides sideways as the page scrolls; on phones, with reduced motion or without
// JavaScript it is a row to swipe.

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
  'NPTEL · IIT Madras': { word: 'NPTEL', color: '#C0392B' },
  'Smart India Hackathon': { word: 'SIH', color: '#2E6BD9' },
}
const fallback: Mark = { word: '✦', color: 'var(--primary)' }
const mark = (issuer: string) => ISSUERS[issuer] ?? fallback

const count = (n: number) => `(${String(n).padStart(2, '0')})`
const number = (i: number) => `(${String(i + 1).padStart(3, '0')})`

let ctx: gsap.Context | null = null
let mm: gsap.MatchMedia | null = null

const showcase = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
const bar = ref<HTMLElement | null>(null)
/** Big screens with motion: the row is pinned and slides sideways with the page scroll */
const pinned = ref(false)

/** The progress line under the row (swipe mode: how far the row has been swiped) */
function onSwipe() {
  const row = track.value
  if (!row || !bar.value || pinned.value) return
  const max = row.scrollWidth - row.clientWidth
  bar.value.style.transform = `scaleX(${max > 0 ? row.scrollLeft / max : 1})`
}

/**
 * The horizontal showcase: the stage sticks to the screen while the section's extra height
 * (exactly the row's overflow) scrolls past, and the row slides left by the same amount. Cards
 * sharpen and grow a little as they slide in from the right.
 */
function setupShowcase() {
  mm = gsap.matchMedia()
  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    const wrap = showcase.value
    const row = track.value
    if (!wrap || !row) return
    pinned.value = true
    // Set straight away (not on the next render): the measurements below depend on it
    wrap.classList.add('is-pinned')
    // How far the row has to slide for its last card to end at the right gutter (measured from
    // the layout, so the slide's own transform never affects it)
    const distance = () => {
      const last = row.lastElementChild as HTMLElement | null
      if (!last) return 0
      const gutter = parseFloat(getComputedStyle(row).paddingRight) || 0
      return Math.max(last.offsetLeft + last.offsetWidth + gutter - row.clientWidth, 0)
    }
    const setHeight = () => {
      wrap.style.height = `${window.innerHeight + distance()}px`
    }
    setHeight()
    ScrollTrigger.addEventListener('refreshInit', setHeight)

    const slide = gsap.to(row, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: wrap,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.7,
        invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set(bar.value, { scaleX: self.progress }),
      },
    })
    for (const card of row.querySelectorAll<HTMLElement>('.cert')) {
      gsap.fromTo(
        card,
        { autoAlpha: 0.35, scale: 0.92 },
        {
          autoAlpha: 1,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            containerAnimation: slide,
            start: 'left 100%',
            end: 'left 65%',
            scrub: true,
          },
        }
      )
    }

    return () => {
      ScrollTrigger.removeEventListener('refreshInit', setHeight)
      wrap.style.height = ''
      wrap.classList.remove('is-pinned')
      pinned.value = false
      gsap.set(row, { clearProps: 'transform' })
    }
  })
  // The page below just moved: measure everything again
  ScrollTrigger.refresh()
}

onMounted(() => {
  track.value?.addEventListener('scroll', onSwipe, { passive: true })
  onSwipe()
  const el = root.value
  if (!el || prefersReducedMotion()) return
  setupShowcase()
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

    // Swipe mode: the certificate cards rise in one after another
    if (!pinned.value) {
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
    }
  }, el)
})

onBeforeUnmount(() => {
  track.value?.removeEventListener('scroll', onSwipe)
  mm?.revert()
  ctx?.revert()
})
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

    <!-- Certifications: a horizontal showcase of the certificates themselves. On big screens
         the row is pinned and slides sideways as the page scrolls; elsewhere it swipes. -->
    <div ref="showcase" class="certs-showcase" :class="{ 'is-pinned': pinned }">
      <div class="certs-stage">
        <div class="certs-head">
          <h3 class="learning__label t-label">
            Certifications
            <span class="learning__count">{{ count(education.certifications.length) }}</span>
          </h3>
          <span class="certs-hint t-label" aria-hidden="true">
            {{ pinned ? 'Scroll' : 'Swipe' }} <span class="certs-hint__arrow">→</span>
          </span>
        </div>
        <ul ref="track" role="list" class="certs" tabindex="0" aria-label="Certifications">
          <li
            v-for="(c, i) in education.certifications"
            :key="c.title"
            class="cert"
            :style="{ '--issuer': mark(c.issuer).color }"
          >
            <div v-if="c.image" class="cert__media">
              <img
                :src="c.image.replace(/\.webp$/, '-card.webp')"
                :alt="`${c.title} certificate`"
                loading="lazy"
                decoding="async"
              />
            </div>
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
              <span class="cert__index t-label" aria-hidden="true">
                {{ number(i) }}<span v-if="c.url || c.image" class="cert__arrow">↗</span>
              </span>
            </div>
            <p class="cert__title">
              <!-- The whole card opens the certificate: its verification page, or the image -->
              <a
                v-if="c.url || c.image"
                :href="c.url ?? c.image"
                class="cert__link"
                target="_blank"
                rel="noopener noreferrer"
                >{{ c.title
                }}<span class="sr-only"> (view certificate, opens in a new tab)</span></a
              >
              <template v-else>{{ c.title }}</template>
            </p>
            <p class="cert__issuer t-label">
              {{ c.issuer }}<template v-if="c.date"> · {{ c.date }}</template>
            </p>
            <p v-if="c.credentialId" class="cert__id">
              <span class="cert__id-label t-label">Credential ID</span>
              <span class="cert__id-value">{{ c.credentialId }}</span>
            </p>
          </li>
        </ul>
        <div class="certs-progress" aria-hidden="true">
          <span ref="bar" class="certs-progress__bar" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.learning {
  display: grid;
  gap: clamp(4rem, 8vw, 7rem);
}

// ---------------------------------------------------------------- Heading
.learning__head {
  display: grid;
  gap: 1.5rem;
  // The heading's words slide in from beyond the sides: keep them from widening the page
  overflow-x: clip;

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

// ---------------------------------------------------------------- Certification showcase
// Full bleed: the row runs past the container's side gutters to the edges of the screen
.certs-showcase {
  --gutter: max(1rem, 4vw);
  margin-inline: calc(-1 * var(--gutter));
}

.certs-stage {
  display: grid;
  // One column, the screen's width: the row inside overflows it rather than stretching it
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
}

.certs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-inline: var(--gutter);
}

.certs-hint {
  color: var(--foreground-muted);
}

.certs-hint__arrow {
  display: inline-block;
  color: var(--primary);
  animation: certs-nudge 1.8s ease-in-out infinite;
}

@keyframes certs-nudge {
  50% {
    transform: translateX(5px);
  }
}

// Swipe mode (phones, reduced motion, no JavaScript): a row that scrolls sideways and snaps
.certs {
  // (positioned: the cards' offsets are measured from the row)
  position: relative;
  display: flex;
  gap: clamp(0.75rem, 1.5vw, 1.25rem);
  margin: 0;
  padding: 0.5rem var(--gutter) 1rem;
  list-style: none;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: var(--gutter);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
  }
}

// Pinned mode (big screens): the stage holds the screen and the row slides with the scroll
.certs-showcase.is-pinned {
  .certs-stage {
    position: sticky;
    top: 0;
    height: 100svh;
    align-content: center;
    // Clear of the fixed header
    padding-top: 4rem;
    // The row runs on past the right edge: keep it from widening the page
    overflow-x: clip;
  }

  .certs {
    overflow: visible;
    scroll-snap-type: none;
    will-change: transform;
  }
}

.certs-progress {
  height: 2px;
  margin-inline: var(--gutter);
  border-radius: 2px;
  background: color-mix(in srgb, var(--foreground) 10%, transparent);
  overflow: hidden;
}

.certs-progress__bar {
  display: block;
  height: 100%;
  background: var(--primary);
  transform: scaleX(0);
  transform-origin: left;
}

.cert {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0.5rem;
  width: min(82vw, 380px);
  padding: 0.75rem 0.75rem 1.25rem;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, transparent);
  border-radius: 1.25rem;
  background: color-mix(in srgb, var(--foreground) 3%, transparent);
  scroll-snap-align: start;
  transition:
    translate 0.5s var(--ease-out),
    border-color 0.4s var(--ease-out),
    background-color 0.4s var(--ease-out),
    box-shadow 0.5s var(--ease-out);

  // Sized by the screen's height too, so a whole card always fits the pinned stage
  @media (min-width: 900px) {
    width: clamp(300px, min(30vw, 56svh), 460px);
  }

  // (translate, not transform: the slide-in motion owns the transform)
  &:hover {
    translate: 0 -4px;
    border-color: color-mix(in srgb, var(--issuer) 60%, transparent);
    background-color: color-mix(in srgb, var(--issuer) 8%, transparent);
    box-shadow: 0 18px 40px -20px color-mix(in srgb, var(--issuer) 55%, transparent);
  }
}

// The certificate itself, whole (portrait or landscape) on a soft panel
.cert__media {
  position: relative;
  aspect-ratio: 1.414;
  margin-bottom: 0.5rem;
  border-radius: 0.85rem;
  overflow: hidden;
  background: color-mix(in srgb, var(--foreground) 7%, transparent);

  // Fills the frame exactly, so a portrait certificate shows whole instead of cropped
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: transform 0.7s var(--ease-out);
  }

  .cert:hover & img {
    transform: scale(1.04);
  }
}

.cert__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0.25rem 0.5rem 0.5rem;
}

.cert__title,
.cert__issuer {
  padding-inline: 0.5rem;
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

// The tile is one big link to the certificate: the title's link covers the whole tile
.cert {
  position: relative;
}

.cert__link {
  color: inherit;
  text-decoration: none;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }

  &:focus-visible {
    outline: none;

    &::after {
      outline: 2px solid var(--issuer);
      outline-offset: 3px;
      border-radius: 1.25rem;
    }
  }
}

.cert__arrow {
  display: inline-block;
  margin-left: 0.4em;
  color: var(--issuer);
  transition: transform 0.4s var(--ease-out);

  .cert:hover & {
    transform: translate(2px, -2px);
  }
}

.cert__id {
  display: grid;
  gap: 0.2rem;
  margin: 0.35rem 0.5rem 0;
  padding-top: 0.6rem;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
}

.cert__id-label {
  font-size: 0.65rem;
  color: var(--foreground-muted);
}

// Long IDs wrap anywhere instead of widening the tile
.cert__id-value {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
  color: var(--foreground);
  opacity: 0.8;
}

@media (prefers-reduced-motion: reduce) {
  .cert,
  .cert__media img,
  .certs-hint__arrow,
  .cert__arrow,
  .edu-row__title,
  .edu-row__years {
    transition: none;
  }

  .certs-hint__arrow {
    animation: none;
  }
}
</style>
