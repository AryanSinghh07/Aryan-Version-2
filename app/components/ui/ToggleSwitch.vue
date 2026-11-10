<script setup lang="ts">
// Accessible on/off switch. Use with v-model.
withDefaults(defineProps<{ label: string; hideLabel?: boolean; disabled?: boolean }>(), {
  hideLabel: false,
  disabled: false,
})

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <button
    type="button"
    role="switch"
    class="toggle"
    :aria-checked="model"
    :aria-label="hideLabel ? label : undefined"
    :disabled="disabled"
    @click="model = !model"
  >
    <span v-if="!hideLabel" class="toggle__label t-label">{{ label }}</span>
    <span class="toggle__track" aria-hidden="true">
      <span class="toggle__thumb" />
    </span>
  </button>
</template>

<style scoped lang="scss">
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;

  &[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.toggle__track {
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  min-width: 40px;
  min-height: 22px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease;
}

.toggle__thumb {
  position: absolute;
  top: 50%;
  left: 3px;
  width: calc(50% - 4px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--foreground-muted);
  transform: translateY(-50%);
  transition:
    left 0.25s cubic-bezier(0.65, 0, 0.35, 1),
    background-color 0.25s ease;
}

.toggle[aria-checked='true'] {
  .toggle__track {
    background: var(--primary);
    border-color: var(--primary);
  }

  .toggle__thumb {
    left: calc(50% + 1px);
    background: var(--on-primary);
  }
}
</style>
