import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import glsl from 'vite-plugin-glsl'

/** Inline <script> types the browser runs (and so the Content Security Policy must allow) */
const RUNNABLE = new Set(['', 'text/javascript', 'application/javascript', 'module', 'importmap'])

const sha256 = (text: string) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`
/** An attribute value as the browser reads it (the HTML escapes undone) */
const unescapeHtml = (text: string) =>
  text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

/**
 * The SHA-256 hashes of every inline script the built pages run (the theme script, Nuxt's
 * config and the import map), and of the inline event handlers (Nuxt Image's onerror marker),
 * so the policy can allow exactly those and nothing else
 */
async function inlineScriptHashes(dir: string) {
  const scripts = new Set<string>()
  const handlers = new Set<string>()
  const files = (await readdir(dir, { recursive: true })).filter((f) => f.endsWith('.html'))
  for (const file of files) {
    const html = await readFile(join(dir, file), 'utf8')
    for (const [, attrs = '', body = ''] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/\ssrc=/.test(attrs) || !body) continue
      const type = /\stype="([^"]*)"/.exec(attrs)?.[1] ?? ''
      if (!RUNNABLE.has(type)) continue
      scripts.add(sha256(body))
    }
    for (const [, code = ''] of html.matchAll(/<[a-z][^>]*?\son[a-z]+="([^"]*)"/g)) {
      handlers.add(sha256(unescapeHtml(code)))
    }
  }
  return { scripts: [...scripts].sort(), handlers: [...handlers].sort() }
}

/**
 * Security headers for every response, as Netlify's _headers file. Scripts may only come from
 * this site (plus the hashed inline ones; WebAssembly for the 3D model decoders); nothing may
 * frame the site; forms only post back to it.
 */
function securityHeaders({ scripts, handlers }: { scripts: string[]; handlers: string[] }) {
  // 'unsafe-hashes' lets only the listed event handlers run, matched by hash
  const allowed = [...scripts, ...(handlers.length ? ["'unsafe-hashes'", ...handlers] : [])]
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval' ${allowed.join(' ')}`,
    // Vue's style bindings and Nuxt's inlined page styles
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    // The 3D models, sounds and page data are fetched from the site; decoders unpack into blobs
    "connect-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ')
  return [
    '/*',
    `  Content-Security-Policy: ${csp}`,
    '  Strict-Transport-Security: max-age=63072000; includeSubDomains',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    '  Cross-Origin-Opener-Policy: same-origin',
    '',
    // Built files carry a content hash in their name: they never change, cache them for a year
    '/_nuxt/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n')
}

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

  // The published site keeps its internals out of the browser's developer tools: no source
  // maps (only the minified code ships, never the original files), no console messages, no
  // debugger statements, and no internal pages (the style guide stays a development tool)
  sourcemap: { client: false, server: false },
  $production: {
    vite: {
      // The site's own code, as it is compiled
      esbuild: { drop: ['console', 'debugger'], legalComments: 'none' },
      // Every bundled file (the libraries too), as the final code is minified
      build: {
        rolldownOptions: {
          output: {
            minify: { compress: { dropConsole: true, dropDebugger: true }, mangle: true },
          },
        },
      },
    },
    hooks: {
      'pages:extend'(pages) {
        const internal = pages.findIndex((page) => page.path === '/styleguide')
        if (internal >= 0) pages.splice(internal, 1)
      },
    },
  },

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
      // The "A" logo (icons in /public)
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      meta: [
        { name: 'color-scheme', content: 'light dark' },
        // The browser bar's colour on phones, matching each theme's page background
        { name: 'theme-color', content: '#fbfaff', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#120a1f', media: '(prefers-color-scheme: dark)' },
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
      // Pages as about.html rather than about/index.html: Netlify then serves each at its own
      // address (/about) instead of redirecting to /about/, matching the canonical links
      autoSubfolderIndex: false,
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
    // sitemap.xml, robots.txt and the security headers (_headers), written after prerendering
    // from the pages that were built
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
        // Every page is rebuilt on each deploy: the build date is when it last changed
        const lastmod = new Date().toISOString().slice(0, 10)
        const urls = [...pages]
          .sort()
          .map(
            (path) =>
              `  <url><loc>${siteUrl}${path === '/' ? '/' : path}</loc><lastmod>${lastmod}</lastmod></url>`
          )
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
        await writeFile(join(dir, '_headers'), securityHeaders(await inlineScriptHashes(dir)))
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
