<script setup lang="ts">
import { gsap } from 'gsap'

// The other ways to reach Aryan, as ruled rows: the name of the channel, the handle in big
// type, an arrow that turns on hover while a wash of violet sweeps in under the row. Then the
// availability and the resume.
//
// Motion: the rows draw in line by line as they scroll in.
const props = defineProps<{
  phone: string
  socials: { label: string; handle: string; url: string }[]
  availability: string
  resume: string
}>()

const root = ref<HTMLElement | null>(null)
const rows = computed(() => [
  ...props.socials.map((s) => ({ ...s, external: true })),
  {
    label: 'Phone',
    handle: props.phone,
    url: `tel:${props.phone.replace(/\s/g, '')}`,
    external: false,
  },
])

let ctx: gsap.Context | null = null

onMounted(() => {
  const el = root.value
  if (!el || prefersReducedMotion()) return
  ctx = gsap.context(() => {
    const items = el.querySelectorAll('.channel, .channels__extra > *')
    gsap.set(items, { '--line': 0, autoAlpha: 0, y: 24 })
    gsap.to(items, {
      '--line': 1,
      autoAlpha: 1,
      y: 0,
      duration: 1,
      stagger: 0.08,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 80%', once: true },
    })
  }, el)
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <aside ref="root" class="channels" aria-labelledby="channels-title">
    <h2 id="channels-title" class="channels__title t-label t-muted">Elsewhere</h2>
    <ul role="list" class="channels__list">
      <li v-for="r in rows" :key="r.url" class="channel">
        <a
          :href="r.url"
          class="channel__link"
          :target="r.external ? '_blank' : undefined"
          :rel="r.external ? 'noopener noreferrer' : undefined"
        >
          <span class="channel__label t-label">{{ r.label }}</span>
          <span class="channel__handle">{{ r.handle }}</span>
          <span class="channel__arrow" aria-hidden="true">↗</span>
        </a>
      </li>
    </ul>

    <div class="channels__extra">
      <div class="channels__card">
        <p class="channels__status t-label">
          <span class="channels__pulse" aria-hidden="true" />Available now
        </p>
        <p class="channels__availability">{{ availability }}</p>
      </div>
      <a :href="resume" class="channels__resume" download>
        <span>Download resume</span>
        <span class="channels__resume-meta t-label">PDF</span>
        <span class="channels__resume-icon" aria-hidden="true">↓</span>
      </a>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.channels {
  display: grid;
  gap: 1.25rem;
  align-content: start;

  // Beside the form on wide screens, it stays in view while the form scrolls
  @media (min-width: 1100px) {
    position: sticky;
    top: 7rem;
  }
}

.channels__title {
  margin: 0;
}

.channels__list {
  margin: 0;
  padding: 0;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 14%, transparent);
}

.channel {
  --line: 1;

  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: color-mix(in srgb, var(--foreground) 14%, transparent);
    transform: scaleX(var(--line));
    transform-origin: 0 50%;
  }
}

.channel__link {
  position: relative;
  display: grid;
  grid-template-columns: 6.5rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  padding: 1.35rem 0.75rem;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: 0.75rem;
    background: linear-gradient(90deg, rgba(var(--primary-rgb), 0.16), transparent 80%);
    transform: scaleX(0);
    transform-origin: 0 50%;
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &:hover::before,
  &:focus-visible::before {
    transform: scaleX(1);
  }
}

.channel__label {
  color: var(--foreground-muted);
  font-size: 0.7rem;
}

.channel__handle {
  overflow: hidden;
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 2vw, 1.9rem);
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    transform 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.3s ease;

  .channel__link:hover &,
  .channel__link:focus-visible & {
    transform: translateX(0.6rem);
    color: var(--primary);
  }
}

.channel__arrow {
  display: grid;
  place-items: center;
  width: 2.25rem;
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--foreground) 18%, transparent);
  border-radius: 50%;
  transition:
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    background-color 0.3s ease,
    border-color 0.3s ease,
    color 0.3s ease;

  .channel__link:hover &,
  .channel__link:focus-visible & {
    transform: rotate(45deg);
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
  }
}

.channels__extra {
  display: grid;
  gap: 1rem;
  margin-top: 1.5rem;
}

.channels__card {
  display: grid;
  gap: 0.6rem;
  padding: 1.5rem;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
  border-radius: 1.25rem;
  background:
    radial-gradient(80% 100% at 100% 0%, rgba(61, 220, 132, 0.12), transparent 70%),
    color-mix(in srgb, var(--foreground) 4%, var(--page-bg));

  p {
    margin: 0;
  }
}

.channels__status {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: #3ddc84;
}

.channels__pulse {
  width: 0.5rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: currentColor;
  animation: channels-pulse 2s ease-out infinite;
}

@keyframes channels-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(61, 220, 132, 0.6);
  }
  70%,
  100% {
    box-shadow: 0 0 0 9px rgba(61, 220, 132, 0);
  }
}

.channels__availability {
  line-height: 1.5;
}

.channels__resume {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 0.9rem 0.9rem 1.5rem;
  border-radius: 999px;
  background: var(--foreground);
  color: var(--page-bg);
  font-weight: 500;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;

  &:hover {
    background: var(--primary);
    color: #fff;
  }
}

.channels__resume-meta {
  margin-left: auto;
  font-size: 0.65rem;
  opacity: 0.6;
}

.channels__resume-icon {
  display: grid;
  place-items: center;
  width: 2.25rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--page-bg);
  color: var(--foreground);
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);

  .channels__resume:hover & {
    transform: translateY(3px);
    animation: channels-drop 0.9s ease-in-out infinite;
  }
}

@keyframes channels-drop {
  50% {
    transform: translateY(5px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .channels__pulse {
    animation: none;
  }
}
</style>
