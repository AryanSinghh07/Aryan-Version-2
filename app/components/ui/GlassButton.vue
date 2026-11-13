<script setup lang="ts">
// The site's button. Renders a NuxtLink (to), an <a> (href) or a <button>.
//
// Primary is liquid glass, five layers deep:
//   1. glass base: the page colour at 10% with a light blur, so the 3D world shows through
//   2. liquid: a canvas of soft violet, periwinkle and lilac blobs drifting inside the pill
//   3. glow: a blurred violet light under the bottom half that blooms on hover
//   4. text roll: the label exists twice in a one-line window; on hover both slide up
//   5. shape: a pill with a 1px edge
// The other variants are flat, and each hovers to its own colour at 10%.
// On mouse and trackpad devices every button is also magnetic.
export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'ghost' | 'ghost-primary' | 'danger' | 'ghost-danger'

const props = withDefaults(
  defineProps<{
    to?: string
    href?: string
    variant?: ButtonVariant
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  { to: undefined, href: undefined, variant: 'primary', type: 'button', disabled: false }
)

const NuxtLink = resolveComponent('NuxtLink')
const isExternal = computed(() => !!props.href && /^https?:\/\//.test(props.href))

const tag = computed(() => (props.to ? NuxtLink : props.href ? 'a' : 'button'))
const attrs = computed(() => {
  if (props.to) return { to: props.to }
  if (props.href)
    return {
      href: props.href,
      ...(isExternal.value ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
    }
  return { type: props.type, disabled: props.disabled }
})

// The root may be a component (NuxtLink) or a plain element
const root = ref<HTMLElement | { $el: HTMLElement } | null>(null)
useMagnetic(() => {
  const r = root.value
  return r && '$el' in r ? r.$el : r
})

const liquid = computed(() => props.variant === 'primary')
const canvas = ref<HTMLCanvasElement | null>(null)
const hovered = ref(false)
useLiquidCanvas(canvas, hovered)
</script>

<template>
  <component
    :is="tag"
    ref="root"
    v-bind="attrs"
    class="glass-button"
    :class="`glass-button--${variant}`"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
    @focus="hovered = true"
    @blur="hovered = false"
  >
    <span v-if="liquid" class="glass-button__glow" aria-hidden="true" />
    <span class="glass-button__body">
      <canvas v-if="liquid" ref="canvas" class="glass-button__liquid" aria-hidden="true" />
      <span class="glass-button__roll">
        <span class="glass-button__label"><slot /></span>
        <span class="glass-button__label glass-button__label--copy" aria-hidden="true"
          ><slot
        /></span>
      </span>
    </span>
  </component>
</template>

<style scoped lang="scss">
.glass-button {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  min-height: max(44px, 2.75rem);
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: var(--text-button);
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  transition: transform 0.3s var(--ease-out);

  &:active {
    transform: scale(0.97);
  }

  &[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// Layer 5, shape: the pill that clips the glass and the liquid
.glass-button__body {
  position: relative;
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 0.75em 1.6em;
  border: 1px solid transparent;
  border-radius: inherit;
  overflow: hidden;
  transition:
    background-color 0.4s var(--ease-out),
    border-color 0.4s var(--ease-out),
    color 0.4s var(--ease-out);
}

// Layer 2, liquid
.glass-button__liquid {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

// Layer 3, glow: outside the clip so it can bloom below the pill
.glass-button__glow {
  position: absolute;
  inset: 50% 12% -10%;
  z-index: -1;
  border-radius: 999px;
  background: var(--primary);
  filter: blur(20px);
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity 0.4s var(--ease-out),
    transform 0.4s var(--ease-out);
  pointer-events: none;
}

// Layer 4, text roll: two copies in a one-line window
.glass-button__roll {
  position: relative;
  display: inline-grid;
  overflow: hidden;
  // A little room so descenders and accents are never clipped
  padding-block: 0.15em;
  margin-block: -0.15em;
}

.glass-button__label {
  grid-area: 1 / 1;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  transition: transform 0.5s var(--ease-out);
}

.glass-button__label--copy {
  transform: translateY(110%);
  transition-delay: 0.03s;
}

@media (hover: hover) and (pointer: fine) {
  .glass-button:hover:not([disabled]) {
    .glass-button__label {
      transform: translateY(-120%);
    }

    .glass-button__label--copy {
      transform: translateY(0);
    }
  }
}

.glass-button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

// Variants. Every hover is the variant's own colour at 10%.

// Primary: liquid glass (layer 1 is the body's fill)
.glass-button--primary {
  color: var(--foreground);

  .glass-button__body {
    background: rgba(var(--background-rgb), 0.1);
    border-color: rgba(var(--primary-rgb), 0.35);
    backdrop-filter: blur(2px);
  }

  &:hover:not([disabled]) {
    .glass-button__body {
      border-color: rgba(var(--primary-rgb), 0.6);
    }

    .glass-button__glow {
      opacity: 0.55;
      transform: scale(1);
    }
  }
}

.glass-button--secondary {
  color: var(--primary);

  .glass-button__body {
    background: var(--surface);
    border-color: var(--border);
  }

  &:hover:not([disabled]) .glass-button__body {
    border-color: var(--primary);
  }
}

.glass-button--outline {
  color: var(--foreground-muted);

  .glass-button__body {
    border-color: var(--border);
  }

  &:hover:not([disabled]) {
    color: var(--foreground);

    .glass-button__body {
      background: rgba(var(--contrast-rgb), 0.1);
    }
  }
}

.glass-button--ghost {
  color: var(--foreground);

  &:hover:not([disabled]) .glass-button__body {
    background: rgba(var(--contrast-rgb), 0.1);
  }
}

.glass-button--ghost-primary {
  color: var(--primary);

  &:hover:not([disabled]) .glass-button__body {
    background: rgba(var(--primary-rgb), 0.1);
  }
}

.glass-button--danger {
  color: var(--danger);

  .glass-button__body {
    background: rgba(var(--danger-rgb), 0.12);
  }

  &:hover:not([disabled]) {
    color: var(--danger-strong);
  }
}

.glass-button--ghost-danger {
  color: var(--danger);

  &:hover:not([disabled]) .glass-button__body {
    background: rgba(var(--danger-rgb), 0.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .glass-button__label,
  .glass-button__glow {
    transition: none;
  }
}
</style>
