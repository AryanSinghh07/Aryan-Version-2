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

  css: [
    '~/assets/styles/themes.scss',
    '~/assets/styles/typography.scss',
    '~/assets/styles/base.scss',
  ],

  // Self-hosted at build time; fallback metrics are generated to avoid layout shift
  fonts: {
    families: [
      {
        name: 'Instrument Serif',
        provider: 'google',
        weights: [400],
        styles: ['normal', 'italic'],
      },
      { name: 'JetBrains Mono', provider: 'google', weights: [500] },
      { name: 'Satoshi', provider: 'fontshare', weights: [400, 500] },
    ],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      // Before the first paint: marks JavaScript as on (the preloader only shows with it)
      // and sets the theme so dark-mode visitors never see a light flash.
      // The storage key must match STORAGE_KEYS.theme in app/stores/app.ts.
      script: [
        {
          tagPosition: 'head',
          innerHTML: `(function(){var d=document.documentElement,t;d.classList.add('js');try{t=localStorage.getItem('aryan-theme')}catch(e){}if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.dataset.theme=t})()`,
        },
      ],
      meta: [
        { name: 'color-scheme', content: 'light dark' },
        {
          name: 'description',
          content:
            'Aryan Singh, Full Stack Developer and AI/ML Engineer. Building things that actually matter.',
        },
      ],
    },
  },

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
    // Shader chunks are pulled in with #import, leaving #include free for three.js' own chunks
    plugins: [glsl({ importKeywords: ['#import'] })],
  },

  typescript: {
    strict: true,
  },

  hooks: {
    // three.js references its own copies of the Draco and Basis decoders, so the bundler
    // emits them and Nuxt would preload them on every page (~190 KB gzip of unused JS plus
    // the .wasm files). The loaders use /draco/ and /basis/ instead, fetched only when a
    // compressed model or texture actually loads, so never preload the bundled copies.
    'build:manifest'(manifest) {
      for (const [key, chunk] of Object.entries(manifest)) {
        if (/draco|basis/i.test(key) || /draco|basis/i.test(chunk.file)) {
          chunk.preload = false
          chunk.prefetch = false
        }
      }
    },
  },
})
