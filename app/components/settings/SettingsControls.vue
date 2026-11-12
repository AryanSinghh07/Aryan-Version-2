<script setup lang="ts">
import type { Quality } from '~/stores/app'

// Sound, dark mode and quality. Every change applies at once and is saved in localStorage.
// Used by the header's settings popover and the mobile menu.
const props = withDefaults(defineProps<{ idPrefix?: string }>(), { idPrefix: 'settings' })

const store = useAppStore()
const hydrated = useHydrated()

// Server defaults until mounted (see useHydrated)
const quality = computed<Quality>(() => (hydrated.value ? store.quality : 'auto'))
const autoTier = computed(() => (hydrated.value ? store.autoTier : 'high'))
const webgl = computed(() => (hydrated.value ? store.webgl : null))

const sound = computed({
  get: () => hydrated.value && store.sound,
  set: (value: boolean) => store.setSound(value),
})

const OPTIONS: { value: Quality; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const TIER_NAMES = { high: 'High', medium: 'Medium', low: 'Low' } as const

const qualityHint = computed(() => {
  if (webgl.value === false) return '3D is off in this browser'
  if (quality.value === 'auto') return `Auto is using ${TIER_NAMES[autoTier.value]} on this device`
  if (quality.value === 'low') return 'No smoke, bloom or glass'
  if (quality.value === 'medium') return 'No bloom or refraction'
  return 'Every effect on'
})

const hintId = computed(() => `${props.idPrefix}-quality-hint`)
</script>

<template>
  <div class="settings-controls">
    <UiToggleSwitch v-model="sound" label="Sound" />
    <UiThemeToggle />
    <fieldset class="quality" :disabled="webgl === false" :aria-describedby="hintId">
      <legend class="t-label quality__legend">Quality</legend>
      <div class="quality__options">
        <label v-for="option in OPTIONS" :key="option.value" class="quality__option">
          <input
            type="radio"
            class="quality__input"
            :name="`${idPrefix}-quality`"
            :value="option.value"
            :checked="quality === option.value"
            @change="store.setQuality(option.value)"
          />
          <span class="quality__pill t-label">{{ option.label }}</span>
        </label>
      </div>
      <p :id="hintId" class="quality__hint t-muted" aria-live="polite">{{ qualityHint }}</p>
    </fieldset>
  </div>
</template>

<style scoped lang="scss">
.settings-controls {
  display: grid;
  gap: 0.25rem;
  justify-items: start;
}

.quality {
  display: grid;
  gap: 0.5rem;
  margin: 0.5rem 0 0;
  padding: 0;
  border: 0;

  &[disabled] {
    opacity: 0.5;
  }
}

.quality__legend {
  float: left; // keeps the legend inside the grid like a normal label
  padding: 0;
}

.quality__options {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--border);
  border-radius: 999px;
}

.quality__option {
  position: relative;
}

.quality__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }
}

.quality__pill {
  display: grid;
  place-items: center;
  min-height: 32px;
  padding-inline: 0.7rem;
  border-radius: 999px;
  color: var(--foreground-muted);
  transition:
    background-color 0.25s ease,
    color 0.25s ease;
}

.quality__option:hover .quality__pill {
  color: var(--foreground);
}

.quality__input:checked + .quality__pill {
  background: var(--primary);
  color: var(--on-primary);
}

.quality__input:focus-visible + .quality__pill {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.quality__hint {
  font-size: 0.8125rem;
}
</style>
