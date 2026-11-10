<script setup lang="ts">
// Email address as a mailto link, plus a button that copies it and says "Copied".
const props = defineProps<{ email: string }>()

const { copy, copied, isSupported } = useClipboard({
  source: () => props.email,
  copiedDuring: 2000,
})
</script>

<template>
  <span class="copy-email">
    <a :href="`mailto:${email}`" class="copy-email__link">{{ email }}</a>
    <button
      v-if="isSupported"
      type="button"
      class="copy-email__button t-label"
      :aria-label="copied ? 'Email copied' : 'Copy email address'"
      @click="copy()"
    >
      {{ copied ? 'Copied' : 'Copy' }}
    </button>
    <span class="sr-only" aria-live="polite">{{ copied ? 'Email copied to clipboard' : '' }}</span>
  </span>
</template>

<style scoped lang="scss">
.copy-email {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.copy-email__link {
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
  overflow-wrap: anywhere;

  &:hover {
    color: var(--primary);
  }
}

.copy-email__button {
  min-height: 32px;
  padding: 0.35em 0.8em;
  border: 1px solid var(--border);
  border-radius: 999px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
  }
}
</style>
