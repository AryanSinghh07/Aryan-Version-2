<script setup lang="ts">
import { gsap } from 'gsap'

// Custom cursor: a dot that follows the pointer exactly and a ring that trails behind.
// The ring grows over links and buttons, and shows a label ("View") over elements marked
// data-cursor="View". Only on devices with a mouse or trackpad, and not with reduced motion;
// everyone else keeps the normal cursor.
const enabled = ref(false)
const state = ref<'default' | 'link' | 'label' | 'text' | 'hidden'>('hidden')
const label = ref('')
const dot = ref<HTMLElement | null>(null)
const ring = ref<HTMLElement | null>(null)

const INTERACTIVE = 'a, button, [role="switch"], summary, label, select'
const TEXT = 'input, textarea, [contenteditable="true"]'

let cleanup: (() => void) | null = null

onMounted(async () => {
  if (!hasFinePointer() || prefersReducedMotion()) return
  enabled.value = true
  await nextTick()
  if (!dot.value || !ring.value) return
  document.documentElement.classList.add('has-cursor')

  const dotX = gsap.quickTo(dot.value, 'x', { duration: 0.08, ease: 'power3' })
  const dotY = gsap.quickTo(dot.value, 'y', { duration: 0.08, ease: 'power3' })
  const ringX = gsap.quickTo(ring.value, 'x', { duration: 0.45, ease: 'power3' })
  const ringY = gsap.quickTo(ring.value, 'y', { duration: 0.45, ease: 'power3' })

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
    dotX(e.clientX)
    dotY(e.clientY)
    ringX(e.clientX)
    ringY(e.clientY)
    if (state.value === 'hidden') state.value = 'default'
  }
  const onOver = (e: PointerEvent) => {
    const target = e.target as Element | null
    const labelled = target?.closest<HTMLElement>('[data-cursor]')
    if (labelled) {
      label.value = labelled.dataset.cursor ?? ''
      state.value = 'label'
    } else if (target?.closest(TEXT)) {
      state.value = 'text'
    } else if (target?.closest(INTERACTIVE)) {
      state.value = 'link'
    } else {
      state.value = 'default'
    }
  }
  const onLeave = () => (state.value = 'hidden')

  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerover', onOver, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  cleanup = () => {
    window.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerover', onOver)
    document.documentElement.removeEventListener('pointerleave', onLeave)
    document.documentElement.classList.remove('has-cursor')
  }
})

onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <div v-if="enabled" class="cursor" :class="`cursor--${state}`" aria-hidden="true">
    <div ref="ring" class="cursor__ring">
      <span class="cursor__label t-label">{{ label }}</span>
    </div>
    <div ref="dot" class="cursor__dot" />
  </div>
</template>

<style scoped lang="scss">
.cursor {
  position: fixed;
  inset: 0;
  z-index: 400;
  pointer-events: none;
}

.cursor__dot,
.cursor__ring {
  position: fixed;
  top: 0;
  left: 0;
  border-radius: 50%;
  // The element's centre sits on the pointer (x/y are set by GSAP)
  translate: -50% -50%;
  transition:
    width 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.25s ease,
    background-color 0.25s ease,
    border-color 0.25s ease;
}

.cursor__dot {
  width: 6px;
  height: 6px;
  background: var(--primary);
}

.cursor__ring {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(var(--primary-rgb), 0.5);
}

.cursor__label {
  opacity: 0;
  color: var(--on-accent);
  transition: opacity 0.2s ease;
}

.cursor--link .cursor__ring {
  width: 56px;
  height: 56px;
  border-color: var(--primary);
  background: rgba(var(--primary-rgb), 0.08);
}

.cursor--link .cursor__dot {
  opacity: 0;
}

.cursor--label .cursor__ring {
  width: 88px;
  height: 88px;
  border-color: var(--accent);
  background: var(--accent);
}

.cursor--label .cursor__label {
  opacity: 1;
}

.cursor--label .cursor__dot,
.cursor--text .cursor__dot,
.cursor--text .cursor__ring,
.cursor--hidden .cursor__dot,
.cursor--hidden .cursor__ring {
  opacity: 0;
}
</style>

<style lang="scss">
// Hide the system cursor only while the custom one is running (and never in text fields)
html.has-cursor,
html.has-cursor * {
  cursor: none !important;
}

html.has-cursor input,
html.has-cursor textarea,
html.has-cursor [contenteditable='true'] {
  cursor: text !important;
}
</style>
