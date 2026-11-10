<script setup lang="ts">
// Infinite keyword strip. Two identical groups slide left by exactly one group width.
// Speed tied to scroll velocity is added in Phase 8 (GSAP).
const props = withDefaults(
  defineProps<{
    items: string[]
    separator?: string
    /** Seconds for one full loop */
    duration?: number
    reverse?: boolean
    /** Times the items repeat inside each group, so a group is wider than the screen */
    repeat?: number
  }>(),
  { separator: '✦', duration: 30, reverse: false, repeat: 3 }
)

const groupItems = computed(() => Array.from({ length: props.repeat }, () => props.items).flat())
</script>

<template>
  <div class="marquee" :style="{ '--marquee-duration': `${duration}s` }">
    <p class="sr-only">{{ items.join(', ') }}</p>
    <div class="marquee__track" :class="{ 'marquee__track--reverse': reverse }" aria-hidden="true">
      <div v-for="g in 2" :key="g" class="marquee__group">
        <template v-for="(item, i) in groupItems" :key="`${g}-${i}`">
          <span class="marquee__item">{{ item }}</span>
          <span class="marquee__separator">{{ separator }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.marquee {
  overflow: hidden;
  width: 100%;
  user-select: none;
}

.marquee__track {
  display: flex;
  width: max-content;
  animation: marquee var(--marquee-duration) linear infinite;
}

.marquee__track--reverse {
  animation-direction: reverse;
}

.marquee__group {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.marquee__item,
.marquee__separator {
  padding-inline: 0.5em;
  white-space: nowrap;
}

.marquee__separator {
  color: var(--primary);
}

@keyframes marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .marquee__track {
    animation: none;
  }
}
</style>
