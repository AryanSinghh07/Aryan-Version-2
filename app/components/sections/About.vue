<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

// "Behind the build": a violet pill and one big statement in the display serif (its first
// line indented behind an arrow), a "More about me" button, and a numbered list of what I build
// along the right.
//
// Motion: the statement's words light up from grey to full colour as the section scrolls by
// (scrubbed, so scrolling back dims them again). Once it has gone by, the button and the list
// pin in the middle of the screen: scrolling now only steps the active row (an arrow in place
// of its number, full colour) down the eight rows, the others dimming with distance. After the
// last row the page scrolls on. Hovering a row makes it the active one. Without JavaScript or
// with reduced motion nothing pins, the statement is in full colour and the first row active.
const { data: profile } = await useProfile()

const statement = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)
const foot = ref<HTMLElement | null>(null)
const lenis = useLenis()
const active = ref(0)
const hovered = ref<number | null>(null)
const shown = computed(() => hovered.value ?? active.value)

let ctx: gsap.Context | null = null
let split: SplitText | null = null

const number = (i: number) => `(${String(i + 1).padStart(3, '0')})`

/** How bright a row is: the active one in full, the others fading with distance */
function rowOpacity(i: number) {
  return Math.max(0.12, 1 - Math.abs(i - shown.value) * 0.17)
}

/** Scroll distance for each row while the list is pinned, in screen heights */
const SCROLL_PER_ROW = 0.3

onMounted(async () => {
  if (prefersReducedMotion()) return
  const text = statement.value
  const block = foot.value
  if (!text || !block) return

  ctx = gsap.context(() => {
    // Words light up one after another while the statement crosses the screen
    split = SplitText.create(text, { type: 'words', aria: 'none' })
    gsap.fromTo(
      split.words,
      { opacity: 0.28 },
      {
        opacity: 1,
        stagger: 0.12,
        ease: 'none',
        scrollTrigger: { trigger: text, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
      }
    )

    // The button and the list pin mid-screen while the scroll steps through the rows
    const count = profile.value?.about.services.length ?? 1
    ScrollTrigger.create({
      trigger: block,
      // Centred when it fits; otherwise held near the top
      start: () => (block.offsetHeight < window.innerHeight * 0.8 ? 'center center' : 'top 12%'),
      end: () => `+=${count * window.innerHeight * SCROLL_PER_ROW}`,
      pin: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        active.value = Math.min(count - 1, Math.floor(self.progress * count))
      },
    })
  })

  // The pin made the page taller: re-measure the triggers below and the scroll limit
  await nextTick()
  ScrollTrigger.refresh()
  lenis?.resize()
})

onBeforeUnmount(() => {
  ctx?.revert()
  split?.revert()
})
</script>

<template>
  <section v-if="profile" class="about section container" aria-labelledby="about-title">
    <div class="about__intro">
      <h2 id="about-title" class="about__tag t-label">{{ profile.about.label }}</h2>
      <p ref="statement" class="about__statement">
        <span class="about__indent" aria-hidden="true"><span class="about__arrow">↳</span></span>
        {{ profile.about.statement }}
      </p>
    </div>

    <div ref="foot" class="about__foot">
      <div class="about__cta">
        <UiGlassButton to="/about">
          More about me <span class="about__cta-arrow" aria-hidden="true">↳</span>
        </UiGlassButton>
      </div>

      <ol ref="list" role="list" class="about__list" @pointerleave="hovered = null">
        <li
          v-for="(item, i) in profile.about.services"
          :key="item"
          class="about__row"
          :class="{ 'is-active': shown === i }"
          :style="{ '--row-opacity': rowOpacity(i) }"
          @pointerenter="hovered = i"
        >
          <span class="about__num t-label" aria-hidden="true">
            <span class="about__num-text">{{ number(i) }}</span>
            <span class="about__num-arrow">↳</span>
          </span>
          <span class="about__item">{{ item }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped lang="scss">
.about {
  display: grid;
  gap: clamp(4rem, 10vw, 9rem);
}

// ---------------------------------------------------------------- Statement
.about__intro {
  position: relative;

  @media (min-width: 1024px) {
    max-width: 56%;
  }
}

// The violet pill, sitting in the indent of the statement's first line
.about__tag {
  position: absolute;
  top: 0.35em;
  left: 0;
  margin: 0;
  padding: 0.45em 0.95em;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 0.8rem;
  line-height: 1.2;
  white-space: nowrap;
}

.about__statement {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.5vw, 5.4rem);
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

// The first line starts after the pill and the arrow
.about__indent {
  display: inline-block;
  width: clamp(9rem, 30%, 22rem);
  text-align: right;
  padding-right: 0.45em;
}

.about__arrow {
  display: inline-block;
  font-family: var(--font-body);
  font-size: 0.5em;
  vertical-align: 0.3em;
  color: var(--foreground);
}

// ---------------------------------------------------------------- Button + list
.about__foot {
  display: grid;
  gap: 3rem;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    align-items: start;
  }
}

.about__cta {
  order: 2;

  @media (min-width: 1024px) {
    order: 0;
  }
}

.about__cta-arrow {
  display: inline-block;
  margin-left: 0.35em;
  transition: transform 0.4s var(--ease-out);

  :hover > & {
    transform: translate(2px, 2px);
  }
}

.about__list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.about__row {
  display: grid;
  grid-template-columns: 5rem 1fr;
  align-items: center;
  padding: clamp(0.5rem, 1vw, 0.9rem) 0;
  opacity: var(--row-opacity, 1);
  transition: opacity 0.5s var(--ease-out);
  cursor: default;
}

.about__num {
  position: relative;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
}

.about__num-text,
.about__num-arrow {
  display: inline-block;
  transition:
    opacity 0.4s var(--ease-out),
    transform 0.5s var(--ease-out);
}

// The active row swaps its number for an arrow
.about__num-arrow {
  position: absolute;
  left: 0;
  top: 50%;
  font-family: var(--font-body);
  font-size: 1.9rem;
  line-height: 1;
  color: var(--foreground);
  opacity: 0;
  transform: translate(-10px, -55%);
}

.about__row.is-active {
  .about__num-text {
    opacity: 0;
    transform: translateX(10px);
  }

  .about__num-arrow {
    opacity: 1;
    transform: translate(0, -55%);
  }
}

.about__item {
  justify-self: end;
  text-align: right;
  font-size: clamp(1.4rem, 2.1vw, 2.6rem);
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.02em;
  // Dimmed rows in a neutral grey (the page past the portal is a plain near-black)
  color: color-mix(in srgb, var(--foreground) 60%, transparent);
  transition: color 0.4s var(--ease-out);

  .is-active & {
    color: var(--foreground);
  }
}

@media (max-width: 640px) {
  .about__tag {
    position: static;
    display: inline-block;
    margin-bottom: 1.25rem;
  }

  .about__indent {
    width: auto;
  }

  .about__row {
    grid-template-columns: 3.5rem 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .about__row,
  .about__item,
  .about__num-text,
  .about__num-arrow {
    transition: none;
  }
}
</style>
