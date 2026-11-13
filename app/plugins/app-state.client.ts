// Applies saved settings after hydration and keeps the store in sync with the browser.

export default defineNuxtPlugin((nuxtApp) => {
  const store = useAppStore()
  const router = useRouter()

  // Known right away (no component shows it), so the WebGL world starts on the right page
  store.route = normalizePath(window.location.pathname)

  nuxtApp.hook('app:mounted', () => {
    store.hydrateFromBrowser()
    store.route = normalizePath(router.currentRoute.value.path)

    // Follow the system theme until the visitor picks one
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', (e) => {
      if (!store.themeChosen) store.applyTheme(e.matches ? 'dark' : 'light')
    })
  })

  router.afterEach((to) => {
    store.route = normalizePath(to.path)
  })
})
