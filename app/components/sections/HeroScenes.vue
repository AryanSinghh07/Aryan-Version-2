<script setup lang="ts">
// The home hero: five full-screen scenes from content/profile.json
const { data: profile } = await useProfile()
const intro = computed(() => (profile.value ? `${profile.value.intro} ${profile.value.role}` : ''))
</script>

<template>
  <ScenesSceneStack v-if="profile" :scenes="profile.heroScenes" :intro="intro" label="Hero" />
</template>
