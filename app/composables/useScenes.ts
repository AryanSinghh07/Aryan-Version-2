import type { gsap } from 'gsap'
import { Observer } from 'gsap/Observer'

type Transition = (from: number, to: number, direction: 1 | -1) => gsap.core.Timeline | null

interface ScenesOptions {
  count: number
  /** Builds the animation between two scenes. Input is ignored until it completes. */
  transition: Transition
  /** Called when the visitor scrolls past the last scene (page scroll is released) */
  onRelease?: () => void
  /** Called when scrolling back to the top re-locks the scenes */
  onRelock?: () => void
}

// After an input event, further events within this gap count as the same gesture.
// Swallows trackpad momentum so one swipe moves exactly one scene.
const GESTURE_GAP = 220

/**
 * Full-screen scene switching for the hero.
 * While locked: Lenis is stopped and wheel, swipe and arrow keys move between scenes.
 * Past the last scene the page scrolls normally; scrolling back to the top locks again
 * on the last scene.
 */
export function useScenes(options: ScenesOptions) {
  const store = useAppStore()
  const lenis = useLenis()

  const current = ref(0)
  const locked = ref(false)
  // A fresh hero starts on scene 1: reset the shared scene so the 3D world matches
  store.setScene(0)

  let animating = false
  let gestureActive = false
  let gestureTimer: ReturnType<typeof setTimeout> | undefined
  let observer: Observer | null = null
  let active = false
  let timeline: gsap.core.Timeline | null = null

  function markGesture() {
    const fresh = !gestureActive
    gestureActive = true
    clearTimeout(gestureTimer)
    gestureTimer = setTimeout(() => (gestureActive = false), GESTURE_GAP)
    return fresh
  }

  function goTo(index: number) {
    if (animating || index === current.value || index < 0 || index >= options.count) return
    const from = current.value
    const direction = index > from ? 1 : -1
    current.value = index
    store.setScene(index)
    timeline = options.transition(from, index, direction)
    if (timeline) {
      animating = true
      timeline.eventCallback('onComplete', () => {
        animating = false
        timeline = null
      })
    }
  }

  function next() {
    if (current.value < options.count - 1) goTo(current.value + 1)
    else release()
  }

  function prev() {
    goTo(current.value - 1)
  }

  function lock() {
    if (locked.value) return
    locked.value = true
    store.heroLocked = true
    lenis?.stop()
    lenis?.scrollTo(0, { immediate: true, force: true })
    // The gesture that brought us back to the top must not also change the scene
    markGesture()
    observer = Observer.create({
      target: window,
      type: 'wheel,touch',
      wheelSpeed: -1,
      tolerance: 10,
      preventDefault: true,
      // Let the mobile menu scroll on its own
      ignore: '#mobile-menu',
      onChangeY: (self) => {
        const fresh = markGesture()
        if (!fresh || animating || store.overlayOpen) return
        if (self.deltaY < 0) next()
        else prev()
      },
    })
  }

  function release(notify = true) {
    if (!locked.value) return
    locked.value = false
    store.heroLocked = false
    observer?.kill()
    observer = null
    lenis?.start()
    if (notify) options.onRelease?.()
  }

  function onKey(e: KeyboardEvent) {
    if (!locked.value || store.overlayOpen || e.altKey || e.ctrlKey || e.metaKey) return
    const target = e.target as HTMLElement | null
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
    // Space activates focused buttons and links; only treat it as "next" on the page itself
    if (e.key === ' ' && target?.closest('button, a')) return

    const forward = ['ArrowDown', 'PageDown', ' ', 'ArrowRight'].includes(e.key)
    const back = ['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key)
    if (!forward && !back && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    if (animating) return
    if (e.key === 'Home') goTo(0)
    else if (e.key === 'End') goTo(options.count - 1)
    else if (forward) next()
    else prev()
  }

  // Back at the very top while scrolling up: lock again on the last scene.
  // Uses the real change in position, not Lenis' remembered direction, so the glide that
  // starts after a release (from the top, going down) never re-locks by mistake.
  let lastScroll = 0
  function onScroll({ scroll }: { scroll: number }) {
    const goingUp = scroll < lastScroll
    lastScroll = scroll
    if (!active || locked.value || !goingUp || scroll > 1) return
    lock()
    options.onRelock?.()
  }

  /** Starts scene control. Locks immediately when the page is at the top. */
  function start(startLocked = true) {
    if (active) return
    active = true
    window.addEventListener('keydown', onKey)
    lenis?.on('scroll', onScroll)
    if (startLocked) lock()
  }

  function stop() {
    active = false
    window.removeEventListener('keydown', onKey)
    lenis?.off('scroll', onScroll)
    clearTimeout(gestureTimer)
    timeline?.kill()
    timeline = null
    animating = false
    release(false)
    observer?.kill()
    observer = null
  }

  /** Locks on the current scene (scrolling to the top). Starts scene control if needed. */
  function enter() {
    if (!active) start(true)
    else lock()
  }

  onBeforeUnmount(stop)

  return {
    current,
    locked,
    goTo,
    next,
    prev,
    start,
    stop,
    enter,
    release: () => release(),
  }
}
