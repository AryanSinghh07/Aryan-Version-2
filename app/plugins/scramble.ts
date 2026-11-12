import { gsap } from 'gsap'
import type { Directive } from 'vue'

// v-scramble: on hover the text scrambles into random characters and resolves back, with
// split-colour ghost copies for an RGB glitch. Use on elements that contain plain text only.
// Mouse/trackpad only and off with reduced motion, so touch and keyboard users never see the
// text change; it only scrambles for 0.6 s during a mouse hover and always resolves back.

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_'

type ScrambleEl = HTMLElement & { _scramble?: { text: string; off: () => void; busy: boolean } }

export default defineNuxtPlugin({
  name: 'scramble',
  dependsOn: import.meta.client ? ['gsap'] : [],
  setup(nuxtApp) {
    if (import.meta.server) {
      nuxtApp.vueApp.directive('scramble', { getSSRProps: () => ({}) })
      return
    }

    const scramble: Directive<ScrambleEl> = {
      mounted(el) {
        el.classList.add('scramble')
        const text = el.textContent?.trim() ?? ''
        el.dataset.text = text
        const state = { text, busy: false, off: () => {} }
        el._scramble = state
        if (!hasFinePointer() || prefersReducedMotion()) return

        // Hover on the closest link or button counts, not just the text itself
        const trigger = el.closest<HTMLElement>('a, button') ?? el
        const onEnter = () => {
          if (state.busy || !state.text) return
          state.busy = true
          el.classList.add('is-glitching')
          gsap.to(el, {
            duration: 0.6,
            ease: 'none',
            scrambleText: { text: state.text, chars: CHARS, speed: 0.8, revealDelay: 0.15 },
            onComplete: () => {
              el.textContent = state.text
              el.classList.remove('is-glitching')
              state.busy = false
            },
          })
        }
        trigger.addEventListener('pointerenter', onEnter)
        state.off = () => trigger.removeEventListener('pointerenter', onEnter)
      },
      updated(el) {
        // Content changed (e.g. a new page reused the element): remember the new text
        const state = el._scramble
        if (!state || state.busy) return
        const text = el.textContent?.trim() ?? ''
        if (text !== state.text) {
          state.text = text
          el.dataset.text = text
        }
      },
      unmounted(el) {
        el._scramble?.off()
        gsap.killTweensOf(el)
        delete el._scramble
      },
    }

    nuxtApp.vueApp.directive('scramble', scramble)
  },
})
