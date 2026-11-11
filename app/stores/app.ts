import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark'
export type Quality = 'auto' | 'high' | 'medium' | 'low'

// localStorage keys. THEME_KEY is also read by the inline head script in nuxt.config.ts.
export const STORAGE_KEYS = {
  theme: 'aryan-theme',
  sound: 'aryan-sound',
  quality: 'aryan-quality',
} as const

const QUALITIES: Quality[] = ['auto', 'high', 'medium', 'low']

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode or blocked storage: the setting just won't persist
  }
}

/**
 * Shared state between Vue and the WebGL Experience.
 * Server render always uses the defaults; saved values are applied in the browser
 * after hydration (plugins/app-state.client.ts), so server and client HTML always match.
 */
export const useAppStore = defineStore('app', () => {
  const theme = ref<Theme>('light')
  const sound = ref(false)
  const quality = ref<Quality>('auto')
  const scene = ref(0)
  const route = ref('/')
  /** True once saved browser settings have been applied */
  const ready = ref(false)
  /** True once the visitor has picked a theme themselves (stops following the system setting) */
  const themeChosen = ref(false)

  // Loading and entry flow
  /** Number of tracked assets, and how many have finished (loaded or failed) */
  const loadTotal = ref(0)
  const loadDone = ref(0)
  const loadProgress = computed(() => (loadTotal.value ? loadDone.value / loadTotal.value : 0))
  /** Preloader finished and removed */
  const loaded = ref(false)
  /** Visitor is past the entry gate (or landed on a page without one) */
  const entered = ref(false)
  /** Home hero has page scroll locked while scenes play */
  const heroLocked = ref(false)
  /** A full-screen overlay (mobile menu) is open: page input and scrolling pause */
  const overlayOpen = ref(false)

  /** Counts a loading task towards the preloader progress. Failures still count as done. */
  function trackLoad<T>(task: Promise<T>): Promise<T> {
    loadTotal.value++
    return task.finally(() => {
      loadDone.value++
    })
  }

  function applyTheme(value: Theme) {
    theme.value = value
    if (import.meta.client) document.documentElement.dataset.theme = value
  }

  function setTheme(value: Theme) {
    applyTheme(value)
    themeChosen.value = true
    write(STORAGE_KEYS.theme, value)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function setSound(value: boolean) {
    sound.value = value
    write(STORAGE_KEYS.sound, value ? 'on' : 'off')
  }

  function setQuality(value: Quality) {
    quality.value = value
    write(STORAGE_KEYS.quality, value)
  }

  function setScene(index: number) {
    scene.value = index
  }

  /** Reads saved settings. Browser only. */
  function hydrateFromBrowser() {
    const domTheme = document.documentElement.dataset.theme
    theme.value = domTheme === 'dark' ? 'dark' : 'light'
    const savedTheme = read(STORAGE_KEYS.theme)
    themeChosen.value = savedTheme === 'light' || savedTheme === 'dark'

    sound.value = read(STORAGE_KEYS.sound) === 'on'

    const savedQuality = read(STORAGE_KEYS.quality) as Quality | null
    if (savedQuality && QUALITIES.includes(savedQuality)) quality.value = savedQuality

    ready.value = true
  }

  return {
    theme,
    sound,
    quality,
    scene,
    route,
    ready,
    themeChosen,
    loadTotal,
    loadDone,
    loadProgress,
    loaded,
    entered,
    heroLocked,
    overlayOpen,
    trackLoad,
    applyTheme,
    setTheme,
    toggleTheme,
    setSound,
    setQuality,
    setScene,
    hydrateFromBrowser,
  }
})
