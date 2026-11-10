<script setup lang="ts">
// The five hero scenes, text only. In Phase 4 they become full-screen scenes switched
// by wheel, swipe or arrow keys; this stacked version stays as the no-JS and
// reduced-motion fallback.
const { data: profile } = await useProfile()
const total = computed(() => profile.value?.heroScenes.length ?? 0)
</script>

<template>
  <div v-if="profile" class="scenes">
    <section
      v-for="(scene, i) in profile.heroScenes"
      :key="scene.label"
      class="scene container"
      :class="`scene--${scene.side}`"
      :aria-label="`Scene ${i + 1} of ${total}`"
    >
      <div class="scene__content">
        <div class="scene__meta">
          <UiTag :variant="i === total - 1 ? 'accent' : 'outline'">{{ scene.label }}</UiTag>
          <span class="t-label t-muted"
            >[{{ projectNumber(i + 1) }}/{{ projectNumber(total) }}]</span
          >
        </div>

        <h1 v-if="i === 0" class="t-hero"><UiAccentText :text="scene.headline" /></h1>
        <h2 v-else class="t-h2"><UiAccentText :text="scene.headline" /></h2>

        <p class="scene__text">{{ scene.text }}</p>

        <p v-if="i === 0" class="scene__intro t-label t-muted">
          {{ profile.intro }} {{ profile.role }}
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.scene {
  display: flex;
  align-items: center;
  min-height: 100svh;
  padding-block: 7rem 4rem;
}

.scene__content {
  display: grid;
  gap: 1.5rem;
  max-width: 52rem;
}

.scene__meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.scene__text {
  max-width: 32rem;
  font-size: 1.125rem;
}

@media (min-width: 768px) {
  .scene--right {
    justify-content: flex-end;
  }

  .scene--right .scene__content {
    justify-items: end;
    text-align: right;
  }
}

.scene--center {
  justify-content: center;

  .scene__content {
    justify-items: center;
    text-align: center;
  }
}
</style>
