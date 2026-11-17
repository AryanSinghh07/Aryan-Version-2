<script setup lang="ts">
import { gsap } from 'gsap'

// "Behind the build": a large lead paragraph and a second one, written with marks (bold,
// highlighted keywords and small animated icons between words, see UiAccentText), the playful
// line in a glass quote card, an availability pill and the location, and the numbers as glass
// stat cards with their own glyphs.
//
// Motion: paragraphs rise in, sharpening from a blur; the inline icons pop in; the highlighted
// keywords decode from random characters (and again on hover); the stat cards rise in and
// tilt under the pointer (useGlassCards) while their numbers count up. Without JavaScript or
// with reduced motion the text is simply there.
const { data: profile } = await useProfile()

const text = ref<HTMLElement | null>(null)
const stats = ref<HTMLElement | null>(null)
let ctx: gsap.Context | null = null
const cleanups: (() => void)[] = []

const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/'

function scramble(el: HTMLElement, delay = 0) {
  const word = el.dataset.text ?? el.textContent ?? ''
  el.dataset.text = word
  return gsap.to(el, {
    duration: 0.9,
    delay,
    scrambleText: { text: word, chars: SCRAMBLE, speed: 0.7, revealDelay: 0.15 },
    ease: 'none',
    overwrite: 'auto',
  })
}

useGlassCards(stats, { selector: '.stat' })

onMounted(() => {
  const el = text.value
  if (!el || prefersReducedMotion()) return

  ctx = gsap.context(() => {
    for (const block of el.querySelectorAll<HTMLElement>('[data-block]')) {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: block, start: 'top 85%', once: true },
      })
      // The block rises in, sharpening from a blur
      tl.fromTo(
        block,
        { y: 40, autoAlpha: 0, filter: 'blur(8px)' },
        {
          y: 0,
          autoAlpha: 1,
          filter: 'blur(0px)',
          duration: 1,
          ease: 'expo.out',
          clearProps: 'filter',
        }
      )
      // Its icons pop in with a spin
      const icons = block.querySelectorAll('.inline-icon')
      if (icons.length) {
        tl.fromTo(
          icons,
          { scale: 0, rotate: -90 },
          {
            scale: 1,
            rotate: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: 'back.out(2.2)',
            clearProps: 'transform',
          },
          0.3
        )
      }
      // Its keywords decode one after another
      block.querySelectorAll<HTMLElement>('.keyword').forEach((k, i) => {
        tl.add(scramble(k), 0.45 + i * 0.14)
      })
    }
  }, el)

  // Keywords decode again on hover (mouse and trackpad)
  if (!hasFinePointer()) return
  for (const k of el.querySelectorAll<HTMLElement>('.keyword')) {
    const again = () => {
      if (!gsap.isTweening(k)) scramble(k)
    }
    k.addEventListener('pointerenter', again)
    cleanups.push(() => k.removeEventListener('pointerenter', again))
  }
})

onBeforeUnmount(() => {
  cleanups.forEach((fn) => fn())
  ctx?.revert()
})
</script>

<template>
  <section v-if="profile" class="about section container" aria-labelledby="about-title">
    <div class="section__head">
      <UiSectionLabel :index="1" label="About" />
      <h2 id="about-title" v-reveal class="t-h2">
        <UiAccentText :text="profile.about.headline" />
      </h2>
    </div>

    <div class="about__body">
      <div ref="text" class="about__text">
        <div class="about__story glass-card">
          <p
            v-for="(p, i) in profile.about.paragraphs"
            :key="i"
            data-block
            class="about__para"
            :class="{ 'about__para--lead': i === 0 }"
          >
            <UiAccentText :text="p" />
          </p>
        </div>

        <figure data-block class="about__quote glass-card">
          <UiInlineIcon name="quote" class="about__quote-mark" />
          <blockquote>
            <p><UiAccentText :text="profile.about.funLine" /></p>
          </blockquote>
        </figure>

        <div data-block class="about__meta">
          <span class="about__status">
            <span class="about__pulse" aria-hidden="true" />
            {{ profile.footer.status }}
          </span>
          <span class="about__place">
            <UiInlineIcon name="globe" />
            {{ profile.location }}
          </span>
          <UiGlassButton to="/about" variant="secondary">More about me →</UiGlassButton>
        </div>
      </div>

      <ul ref="stats" role="list" class="about__stats">
        <li v-for="stat in profile.stats" :key="stat.label" class="stat glass-card">
          <span v-if="stat.icon" class="stat__glyph" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false"><path :d="INLINE_ICONS[stat.icon]" /></svg>
          </span>
          <span class="stat__number">
            <UiCounter :value="stat.value" :prefix="stat.prefix" :suffix="stat.suffix" />
          </span>
          <span class="stat__label t-label">{{ stat.label }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped lang="scss">
.about__body {
  display: grid;
  gap: 3.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
    gap: 5rem;
    align-items: start;
  }
}

.about__text {
  display: grid;
  gap: 1.75rem;
  max-width: 44rem;
}

// The story on frosted glass, so it reads clearly over the 3D world in both themes
.about__story {
  display: grid;
  gap: 1.25rem;
  padding: clamp(1.4rem, 2.6vw, 2.25rem);
}

.about__para {
  font-size: 1.125rem;
  line-height: 1.75;
  color: var(--foreground-muted);
}

// The first paragraph leads, larger and brighter
.about__para--lead {
  font-size: clamp(1.3rem, 2vw, 1.6rem);
  line-height: 1.6;
  color: var(--foreground);
}

// Bold phrases stand out in the full text colour
.about__text :deep(strong) {
  font-weight: 650;
  color: var(--foreground);
}

// Highlighted keywords: the accent colour with a fine underline; they decode on reveal
.about__text :deep(.keyword) {
  padding-bottom: 0.08em;
  color: var(--primary);
  font-weight: 600;
  background: linear-gradient(
      color-mix(in srgb, var(--primary) 45%, transparent),
      color-mix(in srgb, var(--primary) 45%, transparent)
    )
    no-repeat left bottom / 100% 0.08em;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  cursor: default;
}

// ---------------------------------------------------------------- Quote card
.about__quote {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  align-items: start;
  margin: 0.5rem 0 0;
  padding: clamp(1.25rem, 2.2vw, 1.75rem);

  blockquote {
    margin: 0;
  }

  p {
    font-size: 1.05rem;
    line-height: 1.7;
    color: var(--foreground-muted);
  }
}

.about__quote-mark {
  font-size: 1.6rem;
}

// ---------------------------------------------------------------- Status row
.about__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
}

.about__status,
.about__place {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 1rem;
  border: 1px solid rgba(var(--foreground-rgb), 0.12);
  border-radius: 999px;
  background-color: rgba(var(--background-rgb), 0.55);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  font-size: 0.95rem;
}

.about__place :deep(.inline-icon) {
  margin: 0;
  font-size: 0.85rem;
}

// A live dot with a soft pulse
.about__pulse {
  position: relative;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--success);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--success);
    animation: pulse 1.8s ease-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }
}

@keyframes pulse {
  from {
    transform: scale(1);
    opacity: 0.6;
  }
  to {
    transform: scale(3);
    opacity: 0;
  }
}

// ---------------------------------------------------------------- Stat cards
.about__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.stat {
  display: grid;
  gap: 0.75rem;
  align-content: start;
  min-height: 12rem;
  padding: clamp(1.1rem, 2vw, 1.5rem);
}

.stat__glyph {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  margin-bottom: 0.75rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(var(--primary-rgb), 0.3);
  background: rgba(var(--primary-rgb), 0.14);
  color: var(--primary);
  transition: transform 0.5s var(--ease-out);

  svg {
    width: 58%;
    height: 58%;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .stat:hover & {
    transform: rotate(-8deg) scale(1.08);
  }
}

.stat__number {
  font-family: var(--font-display);
  font-size: clamp(3rem, 6vw, 4.5rem);
  line-height: 0.85;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
}

.stat__label {
  color: var(--foreground-muted);
}
</style>
