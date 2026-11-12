import { gsap } from 'gsap'
import type { MaybeRefOrGetter } from 'vue'

interface MagneticOptions {
  /** How far the element follows the pointer (0..1 of the pointer's distance from centre) */
  strength?: number
  /** Extra pixels around the element where the pull starts */
  reach?: number
}

/**
 * Magnetic hover: the element drifts towards the pointer when it comes near, and springs
 * back when it leaves. Also sets --mx / --my (0–100%) on the element for a highlight that
 * follows the pointer. Mouse and trackpad only, and off with reduced motion.
 */
export function useMagnetic(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: MagneticOptions = {}
) {
  const { strength = 0.3, reach = 24 } = options
  let cleanup: (() => void) | null = null

  onMounted(() => {
    const el = toValue(target)
    if (!el || !hasFinePointer() || prefersReducedMotion()) return

    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
    let inside = false

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      // Measure from the resting position, not the shifted one
      const tx = (gsap.getProperty(el, 'x') as number) || 0
      const ty = (gsap.getProperty(el, 'y') as number) || 0
      const left = r.left - tx
      const top = r.top - ty
      const near =
        e.clientX > left - reach &&
        e.clientX < left + r.width + reach &&
        e.clientY > top - reach &&
        e.clientY < top + r.height + reach
      if (near) {
        inside = true
        x((e.clientX - (left + r.width / 2)) * strength)
        y((e.clientY - (top + r.height / 2)) * strength)
        el.style.setProperty('--mx', `${((e.clientX - left) / r.width) * 100}%`)
        el.style.setProperty('--my', `${((e.clientY - top) / r.height) * 100}%`)
      } else if (inside) {
        inside = false
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: true })
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      gsap.killTweensOf(el)
      gsap.set(el, { x: 0, y: 0 })
    }
  })

  onBeforeUnmount(() => cleanup?.())
}
