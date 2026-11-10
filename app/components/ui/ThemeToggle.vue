<script setup lang="ts">
// Dark mode switch bound to the app store (saved in localStorage).
const store = useAppStore()

const dark = computed({
  get: () => store.theme === 'dark',
  set: (value: boolean) => store.setTheme(value ? 'dark' : 'light'),
})
</script>

<template>
  <UiToggleSwitch v-model="dark" label="Dark mode" />
</template>
