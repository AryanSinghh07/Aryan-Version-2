<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Site footer in three zones:
//   1. contact block: availability, headline, the two calls to action, and a data grid
//      (social, pages, location with a live IST clock, email with copy-in-place)
//   2. bottom bar: credit, "Keep scrolling", back to top
//   3. the "keep scrolling" reveal into the next page (NextPage)
const { data: profile } = await useProfile()
const lenis = useLenis()

const pages = [
  { to: '/', label: 'Home' },
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]
const index = (i: number) => `[${String(i + 1).padStart(2, '0')}]`

// Live clock in India Standard Time, refreshed every 30 s. Rendered only in the browser,
// so the prerendered page never shows a stale time.
const clock = ref('')
const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
let clockTimer: ReturnType<typeof setInterval> | undefined

// Email: one click copies it; "Copied" takes its place in the same spot for 2 s
const { copy, copied } = useClipboard({
  source: () => profile.value?.email ?? '',
  copiedDuring: 2000,
  legacy: true,
})

function backToTop() {
  if (lenis) lenis.scrollTo(0, { duration: prefersReducedMotion() ? 0 : 1.4 })
  else window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  // Move focus to the top too, so keyboard users continue from the start of the page
  document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true })
}

const root = ref<HTMLElement | null>(null)
let entrance: ScrollTrigger | null = null

// The [01] indexes type in one character at a time
function typeIndexes(els: HTMLElement[]) {
  const tl = gsap.timeline()
  els.forEach((el, i) => {
    const text = el.dataset.text ?? ''
    const state = { n: 0 }
    tl.to(
      state,
      {
        n: text.length,
        duration: text.length * 0.05,
        ease: 'none',
        onUpdate: () => {
          el.textContent = text.slice(0, Math.round(state.n))
        },
      },
      i * 0.06
    )
  })
  return tl
}

onMounted(() => {
  const tick = () => (clock.value = formatter.format(new Date()))
  tick()
  clockTimer = setInterval(tick, 30_000)

  const el = root.value
  if (!el || prefersReducedMotion()) return

  const pieces = [...el.querySelectorAll<HTMLElement>('.footer__piece-inner')]
  const arrow = el.querySelector<HTMLElement>('.footer__arrow')
  const indexes = [...el.querySelectorAll<HTMLElement>('.footer__index')]
  indexes.forEach((i) => (i.textContent = ''))
  gsap.set(pieces, { yPercent: 110 })
  if (arrow) gsap.set(arrow, { xPercent: -120, autoAlpha: 0 })

  entrance = ScrollTrigger.create({
    trigger: el,
    start: 'top 80%',
    once: true,
    onEnter: () => {
      gsap
        .timeline()
        .to(pieces, { yPercent: 0, duration: 1.1, stagger: 0.1, ease: 'power4.out' })
        .to(arrow, { xPercent: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, '-=0.5')
      typeIndexes(indexes)
    },
  })
})

onBeforeUnmount(() => {
  clearInterval(clockTimer)
  entrance?.kill()
})
</script>

<template>
  <footer v-if="profile" ref="root" class="footer">
    <div class="footer__inner container">
      <!-- Zone 1: contact block -->
      <div class="footer__contact">
        <div class="footer__lead">
          <p class="footer__status t-label">
            <span class="footer__dot" aria-hidden="true" />
            {{ profile.footer.status }}
          </p>
          <p class="footer__headline t-hero">
            <span class="footer__piece">
              <span class="footer__piece-inner">
                <UiAccentText :text="profile.footer.headline[0]!" />
              </span>
            </span>
            <span class="footer__piece footer__piece--indent">
              <span class="footer__arrow" aria-hidden="true">→</span>
              <span class="footer__piece-inner">
                <UiAccentText :text="profile.footer.headline[1]!" />
              </span>
            </span>
            <span class="footer__piece">
              <span class="footer__piece-inner">
                <UiAccentText :text="profile.footer.headline[2]!" />
              </span>
            </span>
          </p>
          <div class="footer__actions">
            <UiGlassButton to="/contact">Start a project →</UiGlassButton>
            <UiGlassButton :href="profile.resume" variant="outline" download>
              Download resume ↓
            </UiGlassButton>
          </div>
        </div>

        <div class="footer__details">
          <p class="footer__intro t-label">{{ profile.footer.intro }}</p>
          <div class="footer__data">
            <div class="footer__cell">
              <p class="footer__label">Social</p>
              <ul role="list">
                <li v-for="(s, i) in profile.socials" :key="s.url">
                  <a
                    :href="s.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="footer__link footer__link--external t-label"
                  >
                    <span class="footer__index" aria-hidden="true" :data-text="index(i)">{{
                      index(i)
                    }}</span>
                    <UiRollText>{{ s.label }}</UiRollText>
                    <span class="footer__ext" aria-hidden="true">↗</span>
                  </a>
                </li>
              </ul>
            </div>

            <nav class="footer__cell" aria-label="Footer">
              <p class="footer__label">Pages</p>
              <ul role="list">
                <li v-for="(p, i) in pages" :key="p.to">
                  <NuxtLink :to="p.to" class="footer__link t-label">
                    <span class="footer__index" aria-hidden="true" :data-text="index(i)">{{
                      index(i)
                    }}</span>
                    <UiRollText>{{ p.label }}</UiRollText>
                  </NuxtLink>
                </li>
              </ul>
            </nav>

            <div class="footer__cell">
              <p class="footer__label">Location</p>
              <p class="t-label">{{ profile.location }}, {{ profile.country }}</p>
              <p class="footer__clock t-label t-muted">
                <span>{{ profile.timezone }}</span>
                <time v-if="clock" class="footer__time">{{ clock }}</time>
              </p>
            </div>

            <div class="footer__cell">
              <p class="footer__label">Email</p>
              <button
                type="button"
                class="footer__email t-label"
                :class="{ 'is-copied': copied }"
                :aria-label="`Copy email address ${profile.email}`"
                @click="copy()"
              >
                <span class="footer__email-address">{{ profile.email }}</span>
                <span class="footer__email-done" aria-hidden="true">Copied ✓</span>
              </button>
              <span class="sr-only" aria-live="polite">{{
                copied ? 'Email copied to clipboard' : ''
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Zone 2: bottom bar -->
      <div class="footer__bar t-label">
        <span class="footer__credit t-muted">
          © 2026 {{ profile.name }}. {{ profile.footer.credit }}
        </span>
        <span class="footer__keep" aria-hidden="true">Keep scrolling ↓</span>
        <button type="button" class="footer__top" @click="backToTop">
          <UiRollText>Back to top</UiRollText> ↑
        </button>
      </div>
    </div>

    <!-- Zone 3: the reveal into the next page -->
    <LayoutNextPage />
  </footer>
</template>

<style scoped lang="scss">
.footer {
  border-top: 1px solid var(--border);
  padding-top: clamp(4rem, 9vw, 7rem);
  transition: opacity 0.3s var(--ease-out);

  // Hidden while pages swap, so it never jumps up into the empty space between them
  &.is-navigating {
    opacity: 0;
  }
}

.footer__inner {
  display: grid;
  gap: clamp(3.5rem, 8vw, 6rem);
}

// Zone 1: two halves on a 12-column grid, stacked on small screens
.footer__contact {
  display: grid;
  gap: 3.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    column-gap: 1.2rem;
  }
}

.footer__lead {
  display: grid;
  gap: 2rem;
  justify-items: start;
  align-content: start;

  @media (min-width: 1024px) {
    grid-column: 1 / span 6;
  }
}

.footer__status {
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
  min-height: 32px;
  padding: 0.35em 0.95em;
  border: 1px solid var(--border);
  border-radius: 999px;
}

// Availability dot: the accent colour with a soft pulse
.footer__dot {
  position: relative;
  width: 0.55em;
  height: 0.55em;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 1px rgba(var(--color-deep-plum-rgb), 0.25);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--accent);
    animation: footer-pulse 2s var(--ease-out) infinite;
  }
}

@keyframes footer-pulse {
  from {
    transform: scale(1);
    opacity: 0.8;
  }
  to {
    transform: scale(2.8);
    opacity: 0;
  }
}

.footer__headline {
  display: grid;
  font-size: clamp(3rem, 8.5vw, 7rem);
  line-height: 0.95;
}

// Each piece rises out of its own masked slot
.footer__piece {
  display: block;
  overflow: hidden;
  padding-bottom: 0.08em;
}

.footer__piece-inner {
  display: inline-block;
}

.footer__piece--indent {
  display: flex;
  align-items: center;
  gap: 0.25em;
  padding-left: 0.6em;
}

.footer__arrow {
  display: inline-block;
  font-size: 0.6em;
  color: var(--primary);
}

.footer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.footer__details {
  display: grid;
  gap: 2.5rem;
  align-content: start;

  @media (min-width: 1024px) {
    grid-column: 8 / span 5;
  }
}

.footer__intro {
  max-width: 28rem;
  line-height: 1.6;
}

.footer__data {
  display: grid;
  gap: 2.25rem 1.5rem;

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.footer__cell {
  display: grid;
  gap: 0.75rem;
  align-content: start;

  ul {
    display: grid;
    gap: 0.35rem;
  }
}

.footer__label {
  font-size: 0.9375rem;
  color: var(--foreground-muted);

  &::after {
    content: ';';
  }
}

.footer__link {
  display: inline-flex;
  align-items: baseline;
  gap: 0.6em;
  min-height: 28px;
  transition: color 0.3s var(--ease-out);

  &:hover {
    color: var(--primary);
  }

  &.router-link-exact-active {
    color: var(--primary);
  }
}

.footer__index {
  display: inline-block;
  min-width: 2.6em;
  font-size: 0.75em;
  color: var(--foreground-muted);
}

// External links: the arrow nudges up and to the right on hover
.footer__ext {
  display: inline-block;
  transition: transform 0.4s var(--ease-out);

  .footer__link:hover &,
  .footer__link:focus-visible & {
    transform: translate(0.15em, -0.15em);
  }
}

.footer__clock {
  display: flex;
  gap: 0.6em;
}

.footer__time {
  font-variant-numeric: tabular-nums;
  color: var(--foreground);
}

// Email and "Copied" share one grid cell, so swapping them never moves the layout
.footer__email {
  display: inline-grid;
  justify-items: start;
  min-height: 28px;
  text-align: left;
  overflow-wrap: anywhere;

  > span {
    grid-area: 1 / 1;
    transition:
      opacity 0.3s var(--ease-out),
      transform 0.4s var(--ease-out);
  }

  &:hover .footer__email-address {
    color: var(--primary);
  }
}

.footer__email-address {
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}

.footer__email-done {
  opacity: 0;
  transform: translateY(40%);
  color: var(--success);
}

.footer__email.is-copied {
  .footer__email-address {
    opacity: 0;
    transform: translateY(-40%);
  }

  .footer__email-done {
    opacity: 1;
    transform: none;
  }
}

// Zone 2
.footer__bar {
  display: grid;
  gap: 1rem;
  align-items: center;
  padding-block: 1.5rem;
  border-top: 1px solid var(--border);

  @media (min-width: 768px) {
    grid-template-columns: 1fr auto 1fr;
  }
}

.footer__keep {
  display: none;

  @media (min-width: 768px) {
    display: block;
    text-align: center;
  }
}

.footer__top {
  justify-self: start;
  display: inline-flex;
  gap: 0.4em;
  min-height: 32px;
  align-items: center;

  &:hover {
    color: var(--primary);
  }

  @media (min-width: 768px) {
    justify-self: end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .footer__dot::after {
    animation: none;
  }

  // No scroll-driven reveal: the next page is a plain link
  .footer__keep {
    visibility: hidden;
  }
}
</style>
