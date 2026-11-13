<script setup lang="ts">
usePageSeo({
  description:
    'Aryan Singh, Full Stack Developer and AI/ML Engineer in the Greater Delhi Area. Computer vision, NLP and full-stack products built to ship.',
})

await usePersonSchema()
</script>

<template>
  <div>
    <SectionsHeroScenes />
    <SectionsAbout />
    <SectionsStack />
    <SectionsSelectedWork />
    <SectionsRecognition />
    <SectionsBackground />
    <SectionsContactCta />
  </div>
</template>
