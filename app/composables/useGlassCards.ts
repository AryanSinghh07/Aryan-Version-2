import { gsap } from 'gsap'
import type { Ref } from 'vue'

interface Options {
  /** Cards inside the container (default: .glass-card) */
  selector?: string
  /** Extra entrance work once the cards are in the DOM (runs inside the GSAP context) */
  onMount?: (root: HTMLElement, cards: HTMLElement[]) => void
}

/**
 * Motion for a grid of glass cards (see .glass-card in base.scss): the cards rise in one after
 * another as the grid scrolls into view, sharpening from a blur, and on mouse/trackpad devices
 * each card tilts towards the pointer under a soft spotlight. Nothing moves with reduced
 * motion. Everything is cleaned up when the component unmounts.
 */
export function useGlassCards(root: Ref<HTMLElement | null>, options: Options = {}) {
  let ctx: gsap.Context | null = null
  const cleanups: (() => void)[] = []

  onMounted(() => {
    const el = root.value
    if (!el || prefersReducedMotion()) return
    const cards = [...el.querySelectorAll<HTMLElement>(options.selector ?? '.glass-card')]

    ctx = gsap.context(() => {
      // fromTo with explicit end values, so a remount can't capture the hidden state as final
      gsap.fromTo(
        cards,
        { y: 60, autoAlpha: 0, scale: 0.96, filter: 'blur(10px)' },
        {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.1,
          stagger: 0.09,
          ease: 'expo.out',
          clearProps: 'filter',
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
        }
      )
      options.onMount?.(el, cards)
    }, el)

    if (!hasFinePointer()) return
    for (const card of cards) {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' })
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' })
      gsap.set(card, { transformPerspective: 900 })
      const move = (e: PointerEvent) => {
        const r = card.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width
        const y = (e.clientY - r.top) / r.height
        card.style.setProperty('--mx', `${x * 100}%`)
        card.style.setProperty('--my', `${y * 100}%`)
        ry((x - 0.5) * 7)
        rx((0.5 - y) * 7)
      }
      const leave = () => {
        rx(0)
        ry(0)
      }
      card.addEventListener('pointermove', move)
      card.addEventListener('pointerleave', leave)
      cleanups.push(() => {
        card.removeEventListener('pointermove', move)
        card.removeEventListener('pointerleave', leave)
      })
    }
  })

  onBeforeUnmount(() => {
    cleanups.forEach((fn) => fn())
    ctx?.revert()
  })
}
