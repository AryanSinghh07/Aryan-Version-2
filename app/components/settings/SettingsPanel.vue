<script setup lang="ts">
// Settings popover: sound, dark mode and quality. Closes on Escape or a click outside.
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const button = ref<HTMLButtonElement | null>(null)

onClickOutside(root, () => (open.value = false))
onKeyStroke('Escape', () => {
  if (!open.value) return
  open.value = false
  button.value?.focus()
})
</script>

<template>
  <div ref="root" class="settings">
    <button
      ref="button"
      type="button"
      class="settings__button t-label"
      :aria-expanded="open"
      aria-controls="settings-panel"
      @click="open = !open"
    >
      Settings
    </button>
    <Transition name="settings-pop">
      <div
        v-show="open"
        id="settings-panel"
        class="settings__panel"
        role="group"
        aria-label="Settings"
      >
        <SettingsControls id-prefix="header" />
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.settings {
  position: relative;
}

.settings__button {
  min-height: 44px;
  padding-inline: 0.25rem;

  &:hover,
  &[aria-expanded='true'] {
    color: var(--primary);
  }
}

.settings__panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 16rem;
  padding: 0.75rem 1.25rem 1rem;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: var(--surface);
  box-shadow: 0 1rem 3rem rgba(var(--color-deep-plum-rgb), 0.15);
  // Opens out of the corner under the button
  transform-origin: top right;
}

// Open: the panel unfolds from the button's corner (a rounded reveal that grows down and to the
// left while it settles into place), then its rows slide in one after another.
// Close: a quicker fold back into the corner.
.settings-pop-enter-active {
  transition:
    clip-path 0.55s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.55s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s ease-out;

  :deep(.settings-controls > *) {
    transition:
      transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
      opacity 0.4s ease-out;
  }

  @for $i from 1 through 3 {
    :deep(.settings-controls > :nth-child(#{$i})) {
      transition-delay: #{0.08 + ($i - 1) * 0.06}s;
    }
  }
}

.settings-pop-leave-active {
  transition:
    clip-path 0.3s cubic-bezier(0.7, 0, 0.84, 0),
    transform 0.3s cubic-bezier(0.7, 0, 0.84, 0),
    opacity 0.3s ease-in;
}

.settings-pop-enter-from,
.settings-pop-leave-to {
  clip-path: inset(0 0 100% 40% round 1rem);
  transform: translateY(-6px) scale(0.94);
  opacity: 0;
}

.settings-pop-enter-from :deep(.settings-controls > *) {
  transform: translateY(10px);
  opacity: 0;
}

.settings-pop-enter-to,
.settings-pop-leave-from {
  clip-path: inset(0 0 0 0 round 1rem);
}

@media (prefers-reduced-motion: reduce) {
  .settings-pop-enter-active,
  .settings-pop-leave-active {
    transition: opacity 0.15s linear;

    :deep(.settings-controls > *) {
      transition: none;
    }
  }

  .settings-pop-enter-from,
  .settings-pop-leave-to {
    clip-path: none;
    transform: none;
  }

  .settings-pop-enter-from :deep(.settings-controls > *) {
    transform: none;
    opacity: 1;
  }
}
</style>
