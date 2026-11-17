<script setup lang="ts">
// A small glyph between words (utils/inlineIcons.ts) in a tinted round badge, each with its
// own gentle idle motion: the spark twinkles, the leaf sways, the heart beats, the trophy and
// rocket bob, the mic sends out a ring. Decorative: the sentence reads fully without it.
// No idle motion for visitors who prefer reduced motion.
defineProps<{ name: string }>()
</script>

<template>
  <span class="inline-icon" :class="`inline-icon--${name}`" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false"><path :d="INLINE_ICONS[name]" /></svg>
  </span>
</template>

<style scoped lang="scss">
.inline-icon {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 1.55em;
  height: 1.55em;
  margin: 0 0.18em;
  vertical-align: -0.38em;
  border-radius: 50%;
  border: 1px solid rgba(var(--primary-rgb), 0.35);
  background: rgba(var(--primary-rgb), 0.14);
  color: var(--primary);

  svg {
    width: 62%;
    height: 62%;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .inline-icon--spark svg {
    animation: twinkle 2.4s ease-in-out infinite;
  }

  .inline-icon--leaf svg {
    transform-origin: 20% 80%;
    animation: sway 3s ease-in-out infinite;
  }

  .inline-icon--heart svg {
    animation: beat 1.4s ease-in-out infinite;
  }

  .inline-icon--trophy svg,
  .inline-icon--rocket svg {
    animation: bob 2.2s ease-in-out infinite;
  }

  .inline-icon--rocket svg {
    animation-name: launch;
  }

  .inline-icon--code svg {
    animation: twinkle 3s ease-in-out infinite;
  }

  .inline-icon--globe svg {
    animation: spin 12s linear infinite;
  }

  // The mic sends out a soft ring
  .inline-icon--mic::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 50%;
    border: 1px solid var(--primary);
    animation: ring 2s ease-out infinite;
  }
}

@keyframes twinkle {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
  }
  50% {
    transform: scale(1.18) rotate(18deg);
  }
}

@keyframes sway {
  0%,
  100% {
    transform: rotate(-8deg);
  }
  50% {
    transform: rotate(10deg);
  }
}

@keyframes beat {
  0%,
  100% {
    transform: scale(1);
  }
  15% {
    transform: scale(1.22);
  }
  30% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.14);
  }
}

@keyframes bob {
  0%,
  100% {
    transform: translateY(1px);
  }
  50% {
    transform: translateY(-2px);
  }
}

@keyframes launch {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(1.5px, -1.5px);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes ring {
  from {
    transform: scale(1);
    opacity: 0.7;
  }
  to {
    transform: scale(1.7);
    opacity: 0;
  }
}
</style>
