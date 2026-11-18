import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Ref } from 'vue'

/**
 * Pins `block` mid-screen (near the top when it is too tall to centre) while the scroll steps
 * through `count` items: `onStep` gets the active index, 0 → count − 1. After the last step the
 * page scrolls on; scrolling back plays it in reverse. Nothing pins with reduced motion.
 */
export function usePinnedSteps(
  block: Ref<HTMLElement | null>,
  count: () => number,
  onStep: (index: number) => void,
  /** Scroll distance for each step, in screen heights */
  perStep = 0.3
) {
  const lenis = useLenis()
  let trigger: ScrollTrigger | null = null

  onMounted(async () => {
    const el = block.value
    if (!el || prefersReducedMotion()) return
    trigger = ScrollTrigger.create({
      trigger: el,
      start: () => (el.offsetHeight < window.innerHeight * 0.8 ? 'center center' : 'top 12%'),
      end: () => `+=${count() * window.innerHeight * perStep}`,
      pin: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => onStep(Math.min(count() - 1, Math.floor(self.progress * count()))),
    })
    // The pin made the page taller: re-measure the triggers below and the scroll limit
    await nextTick()
    ScrollTrigger.refresh()
    lenis?.resize()
  })

  onBeforeUnmount(() => {
    trigger?.kill(true)
    trigger = null
  })
}
