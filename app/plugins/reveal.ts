import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import type { Directive } from 'vue'

// v-reveal: headline lines slide up out of a mask when they scroll into view.
// The text is fully visible in the server HTML, so it works without JavaScript,
// and nothing animates for visitors who prefer reduced motion.

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
        const split = SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          // Lines only: the words stay whole text inside each line, so screen readers read it as
          // normal. ('auto' would add aria-label, which isn't allowed on paragraphs.)
          aria: 'none',
          autoSplit: true,
          // Re-split on resize and font load; the returned animation is cleaned up each time
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.1,
              stagger: 0.08,
              ease: 'power4.out',
              scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            }),
        })
        el._reveal = split
      },
      unmounted(el) {
        el._reveal?.revert()
        delete el._reveal
      },
    }

    nuxtApp.vueApp.directive('reveal', reveal)
  },
})
