<script setup lang="ts">
import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import type { ArrowLine } from '~/components/ui/ArrowLines.vue'

// "How it began": right after the room on the About page. A big serif headline on the left
// (its indented line led by a ↳ arrow) with a small label at the foot of the column; on the
// right, the story in large type and a photo.
//
// Motion: as the section scrolls in, the headline rises letter by letter and its indented
// words slide right the way the arrow points, the arrow coming in and then swaying gently;
// the paragraphs decode from random characters one after another; the photo opens upwards.
// Words glitch lightly under the pointer (.text-glitch). Without JavaScript or with reduced
// motion everything is simply shown.
const props = defineProps<{
  story: {
    label: string
    lines: ArrowLine[]
    paragraphs: string[]
    photo?: string
    photoAlt?: string
  }
}>()

const root = ref<HTMLElement | null>(null)
const spoken = computed(() => props.story.lines.map((l) => l.text.replace(/\*/g, '')).join(' '))

let ctx: gsap.Context | null = null
let splits: SplitText[] = []

onMounted(async () => {
  const el = root.value
  if (!el || prefersReducedMotion()) return
  await document.fonts.ready
  if (!root.value) return
  ctx = gsap.context(() => {
    const headline = el.querySelector<HTMLElement>('.story__headline')!
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
    const paragraphs = [...el.querySelectorAll<HTMLElement>('.story__para')]
    const label = el.querySelector<HTMLElement>('.story__label')
    const photo = el.querySelector<HTMLElement>('.story__photo')

    hideText(headline)
    arrowsHide(headline)
    gsap.set(paragraphs, { autoAlpha: 0 })
    if (label) gsap.set(label, { autoAlpha: 0, y: 12 })
    if (photo) gsap.set(photo, { clipPath: 'inset(100% 0 0 0 round 1.25rem)' })

    gsap
      .timeline({ scrollTrigger: { trigger: el, start: 'top 70%', once: true } })
      .add(textIn(headline, 1, 0.9), 0)
      .add(arrowsIn(headline), 0.2)
      .set(paragraphs, { autoAlpha: 1 }, 0.3)
      .add(decodeText(paragraphs, { stagger: 0.35 }), 0.3)
      .to(label ?? [], { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0.6)

    if (photo) {
      gsap.to(photo, {
        clipPath: 'inset(0% 0 0 0 round 1.25rem)',
        duration: 1.4,
        ease: 'expo.inOut',
        scrollTrigger: { trigger: photo, start: 'top 85%', once: true },
      })
    }
  }, el)
})

onBeforeUnmount(() => {
  ctx?.revert()
  splits.forEach((s) => s.revert())
  splits = []
})
</script>

<template>
  <section ref="root" class="story section container" aria-labelledby="story-title">
    <div class="story__side">
      <h2 id="story-title" class="story__headline t-display text-glitch">
        <span class="sr-only">{{ spoken }}</span>
        <UiArrowLines :lines="story.lines" />
      </h2>
      <p class="story__label t-label">{{ story.label }}</p>
    </div>

    <div class="story__body">
      <p v-for="(p, i) in story.paragraphs" :key="i" class="story__para text-glitch">{{ p }}</p>
      <figure v-if="story.photo" class="story__photo">
        <img :src="story.photo" :alt="story.photoAlt" loading="lazy" decoding="async" />
      </figure>
    </div>
  </section>
</template>

<style scoped lang="scss">
.story {
  display: grid;
  gap: 3rem;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 4rem;
    min-height: 100svh;
  }
}

// The headline holds at the top while the story scrolls; the label sits at the foot
.story__side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 2rem;

  @media (min-width: 1024px) {
    position: sticky;
    top: clamp(6rem, 12vh, 8rem);
    align-self: start;
    height: calc(100svh - clamp(6rem, 12vh, 8rem) - 3rem);
  }
}

.story__headline {
  margin: 0;
  font-size: clamp(3.5rem, 8.5vw, 10rem);
  line-height: 0.9;
  text-wrap: initial;
}

.story__label {
  margin: 0;
  color: var(--foreground-muted);
}

.story__body {
  display: grid;
  gap: 2.5rem;
  align-content: start;
}

.story__para {
  margin: 0;
  // While it decodes, the random letters replace the spaces too: let that one long string
  // wrap instead of running off the page (real words always fit)
  overflow-wrap: anywhere;
  font-size: clamp(1.25rem, 1.9vw, 2rem);
  font-weight: 500;
  line-height: 1.32;
  letter-spacing: -0.015em;
  color: var(--foreground);
}

.story__photo {
  margin: 1rem 0 0;
  overflow: hidden;
  border-radius: 1.25rem;
  aspect-ratio: 4 / 5;
  max-width: 34rem;
  background: color-mix(in srgb, var(--foreground) 6%, transparent);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
