<script setup lang="ts">
import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import type { ProjectsCollectionItem } from '@nuxt/content'
import type { ArrowLine } from '~/components/ui/ArrowLines.vue'

// The top of the Work page: a huge "Selected ↳ work" headline over a slow violet glow, a
// short intro and three numbers.
//
// Motion: once the visitor is in, the headline rises letter by letter and its indented word
// slides right the way the arrow points; the intro's words rise; the numbers count up and the
// labels decode. Scrolling on, the headline drifts up and fades, and the glow follows the
// pointer a little. Without JavaScript or with reduced motion everything is simply shown.
const props = defineProps<{ projects: ProjectsCollectionItem[] }>()

const store = useAppStore()
const root = ref<HTMLElement | null>(null)

const lines: ArrowLine[] = [{ text: 'Selected' }, { text: '*work*', indent: 2, arrow: 'start' }]

const years = computed(() => {
  const all = props.projects.map((p) => p.year)
  return { from: Math.min(...all), to: Math.max(...all) }
})
const stats = computed(() => [
  { value: props.projects.length, label: 'Projects shipped' },
  {
    value: props.projects.reduce((n, p) => n + (p.awards?.length ?? 0), 0),
    label: 'Awards & finals',
  },
  { value: years.value.to - years.value.from + 1, label: 'Years building' },
])

let ctx: gsap.Context | null = null
let splits: SplitText[] = []
let stopEntered: (() => void) | undefined
let onPointer: ((e: PointerEvent) => void) | null = null

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

onMounted(async () => {
  const el = root.value
  if (!el || prefersReducedMotion()) return
  await document.fonts.ready
  if (!root.value) return

  const headline = el.querySelector<HTMLElement>('.intro__headline')!
  const lead = el.querySelector<HTMLElement>('.intro__lead')!
  const numbers = [...el.querySelectorAll<HTMLElement>('.intro__value')]
  const labels = [...el.querySelectorAll<HTMLElement>('.intro__decode')]

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
    splits.push(splitText(lead))
    hideText([headline, lead])
    arrowsHide(headline)
    gsap.set(el.querySelectorAll('.intro__fade'), { autoAlpha: 0, y: 16 })
    gsap.set(el.querySelector('.intro__rule'), { scaleX: 0 })
  }, el)

  await whenEntered()
  if (!root.value) return

  ctx.add(() => {
    const tl = gsap.timeline({ delay: 0.25 })
    tl.add(textIn(headline, 1, 0.8), 0)
      .add(arrowsIn(headline), 0.35)
      .to(el.querySelector('.intro__rule'), { scaleX: 1, duration: 1.4, ease: 'expo.inOut' }, 0.4)
      .add(textIn(lead, 1, 1.1), 0.7)
      .to(
        el.querySelectorAll('.intro__fade'),
        { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out' },
        0.8
      )
      .add(decodeText(labels, { upper: true, stagger: 0.1 }), 0.9)
    numbers.forEach((n, i) => {
      const value = Number(n.dataset.value)
      const counter = { v: 0 }
      tl.to(
        counter,
        {
          v: value,
          duration: 1.6,
          ease: 'expo.out',
          onUpdate: () => (n.textContent = String(Math.round(counter.v)).padStart(2, '0')),
        },
        0.9 + i * 0.12
      )
    })

    // Scrolling on: the headline drifts up and fades away. Both ends are stated: the start is
    // always the headline fully shown, whatever state it is in when this is set up (after an
    // in-site page change it can be caught mid page-transition, and would then rest invisible)
    gsap.fromTo(
      headline,
      { yPercent: 0, autoAlpha: 1 },
      {
        yPercent: -18,
        autoAlpha: 0.15,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
      }
    )

    // The glow leans towards the pointer
    const glow = el.querySelector<HTMLElement>('.intro__glow')
    if (glow && window.matchMedia('(pointer: fine)').matches) {
      const x = gsap.quickTo(glow, 'x', { duration: 1.6, ease: 'power3.out' })
      const y = gsap.quickTo(glow, 'y', { duration: 1.6, ease: 'power3.out' })
      onPointer = (e) => {
        x((e.clientX / window.innerWidth - 0.5) * 120)
        y((e.clientY / window.innerHeight - 0.5) * 80)
      }
      window.addEventListener('pointermove', onPointer, { passive: true })
    }
  })
})

onBeforeUnmount(() => {
  stopEntered?.()
  if (onPointer) window.removeEventListener('pointermove', onPointer)
  ctx?.revert()
  splits.forEach((s) => s.revert())
  splits = []
})
</script>

<template>
  <section ref="root" class="intro page-top container" aria-labelledby="work-title">
    <div class="intro__glow" aria-hidden="true">
      <span class="intro__blob intro__blob--a" />
      <span class="intro__blob intro__blob--b" />
    </div>

    <div class="intro__top">
      <UiSectionLabel class="intro__fade" :index="2" label="Work" />
      <p class="intro__range t-label t-muted intro__fade">
        <span class="intro__decode">{{ years.from }} — {{ years.to }}</span>
      </p>
    </div>

    <h1 id="work-title" class="intro__headline t-display text-glitch">
      <span class="sr-only">Selected work</span>
      <UiArrowLines :lines="lines" />
    </h1>

    <span class="intro__rule" aria-hidden="true" />

    <div class="intro__bottom">
      <p class="intro__lead">
        Things I designed, trained and shipped: computer vision for farmers and cattle breeders, a
        calming chatbot for students, and the tools I built for the people around me.
      </p>

      <dl class="intro__stats">
        <div v-for="s in stats" :key="s.label" class="intro__stat intro__fade">
          <dt class="t-label t-muted">
            <span class="intro__decode">{{ s.label }}</span>
          </dt>
          <dd class="intro__value" :data-value="s.value">
            {{ String(s.value).padStart(2, '0') }}
          </dd>
        </div>
      </dl>
    </div>

    <p class="intro__cue t-label intro__fade" aria-hidden="true">
      <span>Scroll to explore</span>
      <span class="intro__cue-arrow">↓</span>
    </p>
  </section>
</template>

<style scoped lang="scss">
.intro {
  position: relative;
  display: grid;
  align-content: end;
  gap: clamp(1.5rem, 3vw, 2.5rem);
  min-height: 100svh;
  padding-bottom: clamp(2rem, 5vh, 3.5rem);
  isolation: isolate;

  @media (max-width: 899px) {
    min-height: 0;
  }
}

// A slow violet glow behind the headline
.intro__glow {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.intro__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.55;
  animation: intro-drift 18s ease-in-out infinite alternate;

  &--a {
    top: 18%;
    left: 8%;
    width: min(46vw, 40rem);
    aspect-ratio: 1;
    background: radial-gradient(circle, rgba(var(--primary-rgb), 0.55), transparent 65%);
  }

  &--b {
    top: 32%;
    right: 4%;
    width: min(38vw, 32rem);
    aspect-ratio: 1;
    background: radial-gradient(circle, rgba(255, 111, 208, 0.32), transparent 65%);
    animation-duration: 22s;
    animation-direction: alternate-reverse;
  }
}

@keyframes intro-drift {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(6vw, -4vh) scale(1.12);
  }
  100% {
    transform: translate(-4vw, 5vh) scale(0.94);
  }
}

.intro__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.intro__range {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.intro__headline {
  margin: 0;
  font-size: clamp(4.5rem, 15vw, 17rem);
  line-height: 0.82;
  letter-spacing: -0.02em;
  text-wrap: initial;
}

.intro__rule {
  display: block;
  height: 1px;
  background: color-mix(in srgb, var(--foreground) 22%, transparent);
  transform-origin: 0 50%;
}

.intro__bottom {
  display: grid;
  gap: 2.5rem;

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 4rem;
  }
}

.intro__lead {
  max-width: 34rem;
  margin: 0;
  font-size: clamp(1.15rem, 1.6vw, 1.5rem);
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.intro__stats {
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: clamp(1.5rem, 4vw, 4rem);
  margin: 0;
}

.intro__stat {
  display: grid;
  gap: 0.4rem;

  dt {
    order: 2;
    font-size: 0.7rem;
  }
}

.intro__value {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(3rem, 6vw, 5.5rem);
  line-height: 0.9;
  font-variant-numeric: tabular-nums;
}

.intro__cue {
  position: absolute;
  right: max(1rem, 4vw);
  top: 0;
  bottom: 0;
  height: fit-content;
  margin: auto 0;
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--foreground-muted);

  > span:first-child {
    writing-mode: vertical-rl;
  }

  @media (min-width: 900px) {
    display: inline-flex;
  }
}

.intro__cue-arrow {
  color: var(--primary);
  animation: intro-bob 1.6s ease-in-out infinite;
}

@keyframes intro-bob {
  50% {
    transform: translateY(6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .intro__blob,
  .intro__cue-arrow {
    animation: none;
  }
}
</style>
