import glsl from 'vite-plugin-glsl'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@nuxt/content',
    '@nuxt/fonts',
    '@nuxt/image',
    '@vueuse/nuxt',
    '@nuxt/eslint',
  ],

  // Static output: every page is prerendered at build time
  ssr: true,
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },

  // Use Node's built-in SQLite so no native module has to compile on Windows
  content: {
    experimental: { sqliteConnector: 'native' },
  },

  vite: {
    plugins: [glsl()],
  },

  typescript: {
    strict: true,
  },
})
