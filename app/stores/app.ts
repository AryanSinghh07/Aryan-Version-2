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
    applyTheme,
    setTheme,
    toggleTheme,
    setSound,
    setQuality,
    setScene,
    hydrateFromBrowser,
  }
})
