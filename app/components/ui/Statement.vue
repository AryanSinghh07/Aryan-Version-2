<script setup lang="ts">
import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'

// A section opener: a violet pill (the section's heading) and one big statement in the
// display serif, its first line indented behind an arrow. The words light up from grey to
// full colour as the statement scrolls by (scrubbed, so scrolling back dims them again).
// Without JavaScript or with reduced motion the statement is simply in full colour.
defineProps<{
  /** Id of the heading, for the section's aria-labelledby */
  id: string
  label: string
  text: string
}>()

const body = ref<HTMLElement | null>(null)
let split: SplitText | null = null
let tween: gsap.core.Tween | null = null

onMounted(() => {
  if (!body.value || prefersReducedMotion()) return
  split = SplitText.create(body.value, { type: 'words', aria: 'none' })
  tween = gsap.fromTo(
    split.words,
    { opacity: 0.28 },
    {
      opacity: 1,
      stagger: 0.12,
      ease: 'none',
      scrollTrigger: { trigger: body.value, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
    }
  )
})

onBeforeUnmount(() => {
  tween?.scrollTrigger?.kill()
  tween?.kill()
  split?.revert()
})
</script>

<template>
  <div class="statement">
    <h2 :id="id" class="statement__tag t-label">{{ label }}</h2>
    <p ref="body" class="statement__text">
      <span class="statement__indent" aria-hidden="true"
        ><span class="statement__arrow">↳</span></span
      >
      {{ text }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.statement {
  position: relative;

  @media (min-width: 1024px) {
    max-width: 56%;
  }
}

// The violet pill, sitting in the indent of the statement's first line
.statement__tag {
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

.statement__text {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.5vw, 5.4rem);
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: -0.01em;
  color: var(--foreground);
}

// The first line starts after the pill and the arrow
.statement__indent {
  display: inline-block;
  width: clamp(9rem, 30%, 22rem);
  text-align: right;
  padding-right: 0.45em;
}

.statement__arrow {
  display: inline-block;
  font-family: var(--font-body);
  font-size: 0.5em;
  vertical-align: 0.3em;
  color: var(--foreground);
}

@media (max-width: 640px) {
  .statement__tag {
    position: static;
    display: inline-block;
    margin-bottom: 1.25rem;
  }

  .statement__indent {
    width: auto;
  }
}
</style>
