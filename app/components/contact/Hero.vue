<script setup lang="ts">
import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import type { ArrowLine } from '~/components/ui/ArrowLines.vue'

// The top of the Contact page: a huge "Let's ↳ talk" headline over a slow violet glow, the
// local time in India ticking beside it, the email address in big type (each letter rolls
// over on hover), and a spinning "open to work" badge that leans towards the pointer and
// glides down to the form.
//
// Motion: once the visitor is in, the headline rises letter by letter and its indented word
// slides right the way the arrow points; the email's letters rise one after another; the
// labels decode. Without JavaScript or with reduced motion everything is simply shown.
const props = defineProps<{
  email: string
  body: string
  location: string
  timezone: string
}>()

const store = useAppStore()
const lenis = useLenis()
const root = ref<HTMLElement | null>(null)
const badge = ref<HTMLElement | null>(null)

const lines: ArrowLine[] = [{ text: "Let's" }, { text: '*talk*', indent: 2, arrow: 'start' }]
const letters = computed(() => [...props.email])
const BADGE = 'Open to work · Replies within 24h · '

// The time in India, ticking (only in the browser, so the server HTML matches)
const time = ref('--:--:--')
const hour = ref<number | null>(null)
const mood = computed(() => {
  if (hour.value === null) return ''
  if (hour.value < 7) return 'Probably asleep, I’ll reply in the morning'
  if (hour.value < 12) return 'Morning here, coffee in hand'
  if (hour.value < 19) return 'Probably at the keyboard right now'
  return 'Evening here, still building'
})
let clock: ReturnType<typeof setInterval> | null = null
function tickClock() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  time.value = `${get('hour')}:${get('minute')}:${get('second')}`
  hour.value = Number(get('hour'))
}

const { copy, copied } = useClipboard({
  source: () => props.email,
  copiedDuring: 2000,
  legacy: true,
})

function toForm() {
  const target = document.querySelector<HTMLElement>('#contact-form')
  if (!target) return
  if (lenis) lenis.scrollTo(target, { offset: -120, duration: 1.4 })
  else target.scrollIntoView({ behavior: 'smooth' })
  setTimeout(
    () => target.querySelector<HTMLElement>('#contact-name')?.focus({ preventScroll: true }),
    1400
  )
}

let ctx: gsap.Context | null = null
let splits: SplitText[] = []
let stopEntered: (() => void) | undefined
let cleanup: (() => void)[] = []

function whenEntered() {
  if (store.entered) return Promise.resolve()
  return new Promise<void>((resolve) => {
    stopEntered = watch(
      () => store.entered,
      (on) => {
        if (!on) return
        stopEntered?.()
        resolve()
      }
    )
  })
}

/** The badge leans towards the pointer while it is near */
function magnetic(el: HTMLElement) {
  const x = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' })
  const y = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' })
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    const near = Math.hypot(dx, dy) < r.width * 0.9
    x(near ? dx * 0.35 : 0)
    y(near ? dy * 0.35 : 0)
  }
  window.addEventListener('pointermove', move, { passive: true })
  cleanup.push(() => window.removeEventListener('pointermove', move))
}

onMounted(async () => {
  tickClock()
  clock = setInterval(tickClock, 1000)

  const el = root.value
  if (!el || prefersReducedMotion()) return
  await document.fonts.ready
  if (!root.value) return

  const headline = el.querySelector<HTMLElement>('.hero__headline')!
  const body = el.querySelector<HTMLElement>('.hero__body')!
  const chars = [...el.querySelectorAll<HTMLElement>('.hero__char')]
  const labels = [...el.querySelectorAll<HTMLElement>('.hero__decode')]

  ctx = gsap.context(() => {
    for (const words of el.querySelectorAll<HTMLElement>('.arrow-words')) {
      splits.push(
        SplitText.create(words, {
          type: 'lines,words,chars',
          mask: 'lines',
          linesClass: textClasses.line,
          wordsClass: textClasses.word,
          charsClass: textClasses.char,
          aria: 'none',
        })
      )
    }
    splits.push(splitText(body))
    hideText([headline, body])
    arrowsHide(headline)
    gsap.set(chars, { yPercent: 110 })
    gsap.set(el.querySelectorAll('.hero__fade'), { autoAlpha: 0, y: 16 })
    gsap.set(badge.value, { scale: 0, rotate: -90 })
  }, el)

  await whenEntered()
  if (!root.value) return

  ctx.add(() => {
    gsap
      .timeline({ delay: 0.25 })
      .add(textIn(headline, 1, 0.8), 0)
      .add(arrowsIn(headline), 0.35)
      .to(
        el.querySelectorAll('.hero__fade'),
        { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, ease: 'expo.out' },
        0.5
      )
      .add(decodeText(labels, { upper: true, stagger: 0.08 }), 0.6)
      .add(textIn(body, 1, 1.1), 0.7)
      .to(chars, { yPercent: 0, duration: 1, stagger: 0.022, ease: 'expo.out' }, 0.8)
      .to(badge.value, { scale: 1, rotate: 0, duration: 1.4, ease: 'elastic.out(1, 0.55)' }, 1)

    // Scrolling on: the headline drifts up and fades away
    gsap.to(headline, {
      yPercent: -16,
      autoAlpha: 0.2,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
    })

    if (badge.value && window.matchMedia('(pointer: fine)').matches) magnetic(badge.value)
  })
})

onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
  stopEntered?.()
  cleanup.forEach((f) => f())
  cleanup = []
  ctx?.revert()
  splits.forEach((s) => s.revert())
  splits = []
})
</script>

<template>
  <section ref="root" class="hero page-top container" aria-labelledby="contact-title">
    <div class="hero__glow" aria-hidden="true">
      <span class="hero__blob hero__blob--a" />
      <span class="hero__blob hero__blob--b" />
    </div>

    <div class="hero__top">
      <UiSectionLabel class="hero__fade" :index="3" label="Contact" />
      <p class="hero__status t-label hero__fade">
        <span class="hero__pulse" aria-hidden="true" />
        <span class="hero__decode">Open to work</span>
      </p>
    </div>

    <div class="hero__main">
      <h1 id="contact-title" class="hero__headline t-display text-glitch">
        <span class="sr-only">Let’s talk</span>
        <UiArrowLines :lines="lines" />
      </h1>

      <button
        ref="badge"
        type="button"
        class="hero__badge"
        aria-label="Go to the contact form"
        data-cursor="Write"
        @click="toForm"
      >
        <svg class="hero__badge-ring" viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <path
              id="contact-badge-path"
              d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"
            />
          </defs>
          <text>
            <textPath href="#contact-badge-path">{{ BADGE }}{{ BADGE }}</textPath>
          </text>
        </svg>
        <span class="hero__badge-core" aria-hidden="true">↓</span>
      </button>
    </div>

    <div class="hero__bottom">
      <div class="hero__mail">
        <p class="t-label t-muted hero__fade"><span class="hero__decode">Write to me</span></p>
        <a :href="`mailto:${email}`" class="hero__email" data-cursor="Mail">
          <span class="sr-only">{{ email }}</span>
          <span class="hero__email-mask" aria-hidden="true">
            <span
              v-for="(c, i) in letters"
              :key="i"
              class="hero__char"
              :style="{ '--d': `${i * 0.012}s` }"
            >
              <span class="hero__char-a">{{ c }}</span>
              <span class="hero__char-b">{{ c }}</span>
            </span>
          </span>
        </a>
        <button type="button" class="hero__copy t-label hero__fade" @click="copy()">
          <span aria-hidden="true">{{ copied ? '✓' : '⧉' }}</span>
          {{ copied ? 'Copied' : 'Copy email' }}
        </button>
        <span class="sr-only" aria-live="polite">{{
          copied ? 'Email copied to clipboard' : ''
        }}</span>
      </div>

      <div class="hero__side">
        <p class="hero__body">{{ body }}</p>
        <div class="hero__clock hero__fade">
          <p class="t-label t-muted">
            <span class="hero__decode">{{ location }} · {{ timezone }}</span>
          </p>
          <p class="hero__time" aria-label="Local time in India">
            <time>{{ time }}</time>
          </p>
          <p class="hero__mood t-muted">{{ mood }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero {
  position: relative;
  display: grid;
  align-content: end;
  gap: clamp(1.5rem, 3vw, 2.5rem);
  min-height: 100svh;
  padding-bottom: clamp(2.5rem, 6vh, 4rem);
  isolation: isolate;

  @media (max-width: 899px) {
    min-height: 0;
  }
}

.hero__glow {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.hero__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.55;
  animation: hero-drift 18s ease-in-out infinite alternate;

  &--a {
    top: 12%;
    right: 6%;
    width: min(48vw, 42rem);
    aspect-ratio: 1;
    background: radial-gradient(circle, rgba(var(--primary-rgb), 0.55), transparent 65%);
  }

  &--b {
    bottom: 4%;
    left: 2%;
    width: min(36vw, 30rem);
    aspect-ratio: 1;
    background: radial-gradient(circle, rgba(69, 212, 255, 0.22), transparent 65%);
    animation-duration: 24s;
    animation-direction: alternate-reverse;
  }
}

@keyframes hero-drift {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-5vw, 4vh) scale(1.1);
  }
  100% {
    transform: translate(4vw, -5vh) scale(0.94);
  }
}

.hero__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.hero__status {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
}

.hero__pulse {
  width: 0.55rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: #3ddc84;
  box-shadow: 0 0 0 0 rgba(61, 220, 132, 0.6);
  animation: hero-pulse 2s ease-out infinite;
}

@keyframes hero-pulse {
  70% {
    box-shadow: 0 0 0 10px rgba(61, 220, 132, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(61, 220, 132, 0);
  }
}

.hero__main {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
}

.hero__headline {
  margin: 0;
  font-size: clamp(4.5rem, min(13vw, 22vh), 15rem);
  line-height: 0.8;
  letter-spacing: -0.02em;
  text-wrap: initial;
}

// The spinning badge
.hero__badge {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: clamp(7.5rem, 13vw, 11rem);
  aspect-ratio: 1;
  margin-bottom: 1rem;
  border-radius: 50%;
  color: var(--foreground);

  @media (max-width: 640px) {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 6.5rem;
    margin-bottom: 0;
  }
}

.hero__badge-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  animation: hero-spin 16s linear infinite;

  text {
    fill: currentColor;
    font-family: var(--font-mono, monospace);
    font-size: 15.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .hero__badge:hover & {
    animation-duration: 5s;
  }
}

@keyframes hero-spin {
  to {
    transform: rotate(360deg);
  }
}

.hero__badge-core {
  display: grid;
  place-items: center;
  width: 46%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: clamp(1.25rem, 2vw, 1.75rem);
  box-shadow: 0 0 40px rgba(var(--primary-rgb), 0.5);
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);

  .hero__badge:hover & {
    transform: scale(1.12);
  }
}

.hero__bottom {
  display: grid;
  gap: 2.5rem;
  padding-top: clamp(1.5rem, 3vw, 2.5rem);
  border-top: 1px solid color-mix(in srgb, var(--foreground) 16%, transparent);

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    align-items: end;
    gap: 4rem;
  }
}

.hero__mail {
  display: grid;
  justify-items: start;
  gap: 0.9rem;
  min-width: 0;

  p {
    margin: 0;
  }
}

// The email, each letter rolling over to a violet copy on hover
.hero__email {
  display: block;
  max-width: 100%;
  font-family: var(--font-display);
  font-size: clamp(1.75rem, min(4.4vw, 7.5vh), 4.25rem);
  line-height: 1.05;
}

.hero__email-mask {
  display: flex;
  flex-wrap: wrap;
}

.hero__char {
  position: relative;
  display: inline-block;
  overflow: hidden;
  white-space: pre;
}

.hero__char-a,
.hero__char-b {
  display: block;
  transition: transform 0.55s cubic-bezier(0.77, 0, 0.18, 1) var(--d);
}

.hero__char-b {
  position: absolute;
  inset: 0;
  color: var(--primary);
  font-style: italic;
  transform: translateY(100%);
}

.hero__email:hover,
.hero__email:focus-visible {
  .hero__char-a {
    transform: translateY(-100%);
  }

  .hero__char-b {
    transform: translateY(0);
  }
}

.hero__copy {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  min-height: 36px;
  padding: 0.4em 1em;
  border: 1px solid color-mix(in srgb, var(--foreground) 18%, transparent);
  border-radius: 999px;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease,
    color 0.3s ease;

  &:hover {
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
  }
}

.hero__side {
  display: grid;
  gap: 2rem;
}

.hero__body {
  max-width: 30rem;
  margin: 0;
  font-size: clamp(1.1rem, 1.5vw, 1.35rem);
  font-weight: 500;
  line-height: 1.4;
}

.hero__clock {
  display: grid;
  gap: 0.35rem;

  p {
    margin: 0;
  }
}

.hero__time {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 4.5vw, 4rem);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.hero__mood {
  font-size: 0.95rem;
}

@media (prefers-reduced-motion: reduce) {
  .hero__blob,
  .hero__pulse,
  .hero__badge-ring {
    animation: none;
  }
}
</style>
