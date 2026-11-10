import { defineCollection, defineContentConfig } from '@nuxt/content'

// Full schemas and the other collections (profile, stack, recognition, education) come in Phase 3
export default defineContentConfig({
  collections: {
    projects: defineCollection({
      type: 'page',
      source: 'projects/*.md',
    }),
  },
})
