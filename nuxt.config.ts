import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import glsl from 'vite-plugin-glsl'

// The site's public address, for canonical links, social cards and the sitemap. Netlify sets
// URL during its builds; NUXT_PUBLIC_SITE_URL overrides it (for example a custom domain).
const siteUrl = (
  process.env.NUXT_PUBLIC_SITE_URL ||
  process.env.URL ||
  'https://aryansingh7.netlify.app'
).replace(/\/$/, '')

// Pages kept out of search results (they also set robots: noindex)
const NOT_INDEXED = ['/thanks', '/styleguide']

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
      // /thanks is only reached by posting the contact form without JavaScript
      routes: ['/', '/thanks'],
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

  runtimeConfig: {
    public: { siteUrl },
  },

  hooks: {
    // sitemap.xml and robots.txt, written after prerendering from the pages that were built
    'nitro:init'(nitro) {
      const pages = new Set<string>()
      nitro.hooks.hook('prerender:route', (route) => {
        const html = route.contentType?.includes('text/html')
        const path = route.route.replace(/(.)\/$/, '$1')
        if (html && !route.error && !path.includes('.') && !NOT_INDEXED.includes(path)) {
          pages.add(path)
        }
      })
      nitro.hooks.hook('prerender:done', async () => {
        const dir = nitro.options.output.publicDir
        const urls = [...pages]
          .sort()
          .map((path) => `  <url><loc>${siteUrl}${path === '/' ? '/' : path}</loc></url>`)
        const sitemap = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          '</urlset>',
          '',
        ]
        await writeFile(join(dir, 'sitemap.xml'), sitemap.join('\n'))
        const robots = ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl}/sitemap.xml`, '']
        await writeFile(join(dir, 'robots.txt'), robots.join('\n'))
      })
    },
    // three.js references its own copies of the Draco and Basis decoders, so the bundler
    // emits them and Nuxt would preload them on every page (~190 KB gzip of unused JS plus
    // the .wasm files). The loaders use /draco/ and /basis/ instead, fetched only when a
    // compressed model or texture actually loads, so never preload the bundled copies.
    // Howler is likewise only needed once a visitor turns sound on (webgl/audio/Sound.ts).
    'build:manifest'(manifest) {
      for (const [key, chunk] of Object.entries(manifest)) {
        if (/draco|basis|howler/i.test(key) || /draco|basis|howler/i.test(chunk.file)) {
          chunk.preload = false
          chunk.prefetch = false
        }
      }
    },
  },
})
