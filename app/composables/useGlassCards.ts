import { gsap } from 'gsap'
import type { Ref } from 'vue'

interface Options {
  /** Cards inside the container (default: .glass-card) */
  selector?: string
  /**
   * Manual: the entrance doesn't wait for the grid to scroll into view; call play() (for
   * example when a hidden panel opens). It can be played again each time.
   */
  manual?: boolean
  /**
   * Extra entrance work, run with the cards' entrance (inside the GSAP context). `manual` says
   * whether it is being played (tweens should start now) or set up for scrolling (tweens
   * should carry their own scroll triggers).
   */
  enter?: (root: HTMLElement, cards: HTMLElement[], manual: boolean) => void
}

/**
 * Motion for a grid of glass cards (see .glass-card in base.scss): the cards rise in one after
 * another, sharpening from a blur (when the grid scrolls into view, or on play() in manual
 * mode), and on mouse/trackpad devices each card tilts towards the pointer under a soft
 * spotlight. Nothing moves with reduced motion. Everything is cleaned up on unmount.
 */
export function useGlassCards(root: Ref<HTMLElement | null>, options: Options = {}) {
  let ctx: gsap.Context | null = null
  const cleanups: (() => void)[] = []
  const reduced = () => prefersReducedMotion()
  const cardsIn = (el: HTMLElement) => [
    ...el.querySelectorAll<HTMLElement>(options.selector ?? '.glass-card'),
  ]

  // fromTo with explicit end values, so playing again (or a remount) can never capture the
  // hidden starting state as the final one
  function entrance(el: HTMLElement, cards: HTMLElement[], manual: boolean) {
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
        overwrite: 'auto',
        ...(manual ? {} : { scrollTrigger: { trigger: el, start: 'top 82%', once: true } }),
      }
    )
    options.enter?.(el, cards, manual)
  }

  /** Plays the entrance now (manual mode) */
  function play() {
    const el = root.value
    if (!el || reduced()) return
    const run = () => entrance(el, cardsIn(el), true)
    if (ctx) ctx.add(run)
    else run()
  }

  onMounted(() => {
    const el = root.value
    if (!el || reduced()) return
    const cards = cardsIn(el)

    ctx = gsap.context(() => {
      if (!options.manual) entrance(el, cards, false)
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

  return { play }
}
