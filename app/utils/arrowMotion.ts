import { gsap } from 'gsap'

// Motion for headlines with arrows (UiArrowLines): the words after a ↳ arrow slide in to the
// right, the way the arrow points, and the arrows themselves come in and then keep a gentle
// idle nudge (↳ sways right, ↴ bobs down). Pair with the letter motion (textIn) for the rise.

const starts = (root: Element) => [...root.querySelectorAll<HTMLElement>('.arrow-start')]
const ends = (root: Element) => [...root.querySelectorAll<HTMLElement>('.arrow-end')]
/** The words that follow a ↳ arrow */
const led = (root: Element) =>
  starts(root)
    .map((a) => a.parentElement?.querySelector<HTMLElement>('.arrow-words'))
    .filter((w): w is HTMLElement => !!w)

/** Arrows hidden and the led words back to the left, ready to play */
export function arrowsHide(root: Element) {
  const arrows = [...starts(root), ...ends(root)]
  gsap.killTweensOf(arrows)
  if (arrows.length) gsap.set(arrows, { autoAlpha: 0, x: 0, y: 0 })
  const words = led(root)
  if (words.length) gsap.set(words, { x: '-0.9em' })
}

/** The words slide right into place, the arrows come in, then idle */
export function arrowsIn(root: Element) {
  const tl = gsap.timeline()
  const words = led(root)
  if (words.length) tl.to(words, { x: 0, duration: 1.3, ease: 'expo.out' }, 0)
  for (const arrow of starts(root)) {
    tl.fromTo(
      arrow,
      { autoAlpha: 0, x: -18 },
      {
        autoAlpha: 1,
        x: 0,
        duration: 0.9,
        ease: 'expo.out',
        onComplete: () => {
          gsap.to(arrow, { x: 7, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        },
      },
      0.15
    )
  }
  for (const arrow of ends(root)) {
    tl.fromTo(
      arrow,
      { autoAlpha: 0, y: -12 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        ease: 'expo.out',
        onComplete: () => {
          gsap.to(arrow, { y: 5, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        },
      },
      0.3
    )
  }
  return tl
}

const SCRAMBLE_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_'
const SCRAMBLE_LOWER = 'abcdefghijklmnopqrstuvwxyz0123456789/<>_'

/**
 * Paragraphs decode from random characters into their text, one after another. Their height
 * is held meanwhile, so the page doesn't shift while the random letters reflow. Plain-text
 * elements only (the text is replaced while it scrambles).
 */
export function decodeText(els: HTMLElement[], { upper = false, stagger = 0.12 } = {}) {
  const tl = gsap.timeline()
  els.forEach((el, i) => {
    const text = el.dataset.text ?? el.textContent?.trim() ?? ''
    el.dataset.text = text
    tl.call(() => (el.style.minHeight = `${el.offsetHeight}px`), [], i * stagger)
    tl.to(
      el,
      {
        duration: Math.min(2.2, 0.6 + text.length / 140),
        ease: 'none',
        scrambleText: {
          text,
          chars: upper ? SCRAMBLE_UPPER : SCRAMBLE_LOWER,
          speed: 0.6,
          revealDelay: 0.1,
        },
        onComplete: () => {
          el.style.minHeight = ''
        },
      },
      i * stagger
    )
  })
  return tl
}

/** Back to the real text (for a replay) */
export function decodeReset(els: HTMLElement[]) {
  for (const el of els) {
    gsap.killTweensOf(el)
    if (el.dataset.text) el.textContent = el.dataset.text
    el.style.minHeight = ''
  }
}
