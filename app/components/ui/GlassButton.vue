<script setup lang="ts">
// Translucent button with a slowly moving gradient sheen. Renders a NuxtLink (to), an <a>
// (href) or a <button>. On mouse/trackpad devices it is magnetic, with a highlight that follows
// the pointer across the glass.
const props = withDefaults(
  defineProps<{
    to?: string
    href?: string
    variant?: 'glass' | 'primary'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  { to: undefined, href: undefined, variant: 'glass', type: 'button', disabled: false }
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
</script>

<template>
  <component
    :is="tag"
    ref="root"
    v-bind="attrs"
    class="glass-button"
    :class="`glass-button--${variant}`"
  >
    <span class="glass-button__label"><slot /></span>
  </component>
</template>

<style scoped lang="scss">
.glass-button {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  min-height: max(44px, 2.75rem);
  padding: 0.75em 1.6em;
  border-radius: 999px;
  overflow: hidden;
  font-family: var(--font-body);
  font-size: var(--text-button);
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  transition:
    transform 0.3s ease,
    background-color 0.3s ease;

  // Gradient border
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: inherit;
    background: linear-gradient(
      135deg,
      rgba(var(--primary-rgb), 0.6),
      rgba(var(--primary-rgb), 0.1) 50%,
      rgba(var(--primary-rgb), 0.5)
    );
    mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    mask-composite: exclude;
    pointer-events: none;
  }

  // Moving gradient sheen
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(
      110deg,
      transparent 20%,
      rgba(var(--primary-rgb), 0.18) 40%,
      rgba(var(--color-lavender-rgb), 0.22) 50%,
      transparent 70%
    );
    background-size: 250% 100%;
    animation: glass-sheen 6s linear infinite;
    pointer-events: none;
  }

  &:active {
    transform: scale(0.97);
  }

  &[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.glass-button--glass {
  // Pointer highlight (--mx/--my set by useMagnetic), over the glass fill
  background:
    radial-gradient(
      circle at var(--mx, 50%) var(--my, 50%),
      rgba(var(--color-lavender-rgb), 0.35),
      transparent 60%
    ),
    var(--glass);
  color: var(--foreground);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);

  &:hover {
    background:
      radial-gradient(
        circle at var(--mx, 50%) var(--my, 50%),
        rgba(var(--color-lavender-rgb), 0.45),
        transparent 60%
      ),
      rgba(var(--primary-rgb), 0.12);
  }
}

.glass-button--primary {
  background: var(--primary);
  color: var(--on-primary);

  &::before {
    display: none;
  }

  &:hover {
    background: var(--primary-active);
  }
}

.glass-button__label {
  position: relative;
}

@keyframes glass-sheen {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -150% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .glass-button::after {
    animation: none;
  }
}
</style>
