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
      title: 'Aryan Singh — Full Stack Developer and AI/ML Engineer',
      // Sets the theme before the first paint so dark-mode visitors never see a light flash.
      // The storage key must match STORAGE_KEYS.theme in app/stores/app.ts.
      script: [
        {
          tagPosition: 'head',
          innerHTML: `(function(){var d=document.documentElement,t;try{t=localStorage.getItem('aryan-theme')}catch(e){}if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.dataset.theme=t})()`,
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
    plugins: [glsl()],
  },

  typescript: {
    strict: true,
  },
})
