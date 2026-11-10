<script setup lang="ts">
// Settings popover. Sound and quality toggles join in Phase 9.
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
    <div
      v-show="open"
      id="settings-panel"
      class="settings__panel"
      role="group"
      aria-label="Settings"
    >
      <UiThemeToggle />
    </div>
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
  min-width: 14rem;
  padding: 0.75rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: var(--surface);
  box-shadow: 0 1rem 3rem rgba(var(--color-deep-plum-rgb), 0.15);
}
</style>
