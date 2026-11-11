import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

// Smooth scrolling driven by the GSAP ticker, so Lenis, ScrollTrigger and (from Phase 5)
// the WebGL render loop all advance on the same frame.
export default defineNuxtPlugin({
  name: 'lenis',
  dependsOn: ['gsap'],
  setup(nuxtApp) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.1,
      smoothWheel: !reducedMotion,
    })

    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)

    // The page can't scroll behind the preloader, entry gate or an open menu.
    // This watcher is created before any component's, so when the visitor enters it runs
    // first and the home hero can lock again straight after.
    const store = useAppStore()
    const shouldRun = () => store.entered && !store.overlayOpen && !store.heroLocked
    lenis.stop()
    watch(
      () => [store.entered, store.overlayOpen] as const,
      () => (shouldRun() ? lenis.start() : lenis.stop())
    )

    // New page content changes the scroll height and trigger positions
    nuxtApp.hook('page:finish', () => {
      requestAnimationFrame(() => {
        lenis.resize()
        ScrollTrigger.refresh()
      })
    })

    return { provide: { lenis } }
  },
})
