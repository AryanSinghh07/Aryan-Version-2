import type { RouterConfig } from '@nuxt/schema'

// Scroll position on navigation, applied through Lenis so its smooth-scroll state never
// drags the page back to the old position. Waits for the new page to render first.
export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    // Same page with only the query changing (e.g. filters): stay put
    if (to.path === from.path && to.hash === from.hash) return false

    const nuxtApp = useNuxtApp()
    return new Promise((resolve) => {
      nuxtApp.hooks.hookOnce('page:finish', () => {
        requestAnimationFrame(() => {
          let top = savedPosition?.top ?? 0
          if (!savedPosition && to.hash) {
            const target = document.querySelector(to.hash)
            if (target) top = target.getBoundingClientRect().top + window.scrollY
          }
          const lenis = useLenis()
          if (lenis) {
            lenis.resize()
            lenis.scrollTo(top, { immediate: true, force: true })
          } else {
            window.scrollTo(0, top)
          }
          resolve(false)
        })
      })
    })
  },
}
