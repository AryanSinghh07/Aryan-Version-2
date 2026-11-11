import type Lenis from 'lenis'

/** The shared Lenis instance. Undefined on the server. */
export function useLenis(): Lenis | undefined {
  return import.meta.client ? (useNuxtApp().$lenis as Lenis | undefined) : undefined
}

/** True when the visitor asked the system for reduced motion. Always false on the server. */
export function prefersReducedMotion() {
  return import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
