import { gsap } from 'gsap'
import type { Directive } from 'vue'

// v-reveal: section headings come in as they scroll into view, with the same motion as the
// hero (utils/textMotion.ts): letters flip up in 3D out of their line masks and sharpen from a
// blur, and the italic accent word springs in after them. Other elements rise word by word.
// The text is fully visible in the server HTML, so it works without JavaScript, and nothing
// animates for visitors who prefer reduced motion.

type RevealEl = HTMLElement & { _reveal?: { revert: () => void } }

export default defineNuxtPlugin({
  name: 'reveal',
  dependsOn: import.meta.client ? ['gsap'] : [],
  setup(nuxtApp) {
    if (import.meta.server) {
      nuxtApp.vueApp.directive('reveal', { getSSRProps: () => ({}) })
      return
    }

    const reveal: Directive<RevealEl> = {
      mounted(el) {
        if (prefersReducedMotion()) return
        // Re-split on resize and font load; the returned animation is rebuilt each time at the
        // same progress
        el._reveal = splitText(el, () =>
          gsap
            .timeline({ scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
            .add(textIn(el))
        )
      },
      unmounted(el) {
        el._reveal?.revert()
        delete el._reveal
      },
    }

    nuxtApp.vueApp.directive('reveal', reveal)
  },
})
