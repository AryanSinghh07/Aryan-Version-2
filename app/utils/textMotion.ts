import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'

// Shared text motion for the hero scenes and the section headings.
//
// Headings are split into lines (masks), words and letters: letters flip up in 3D from
// behind the mask, sharpening out of a blur, and the italic accent word follows a beat later
// with a springy tilt. Paragraphs rise word by word, and keyword underlines draw in once the
// sentence has landed. Small labels decode with a scramble.
//
// Accessibility: headings keep an aria-label with the full text (the letters are hidden from
// screen readers); paragraphs and other elements are split into words only, which read as
// normal text.

const HEADING = /^H[1-6]$/

export const textClasses = {
  line: 'tm-line',
  word: 'tm-word',
  char: 'tm-char',
} as const

/** Splits a heading into lines, words and letters, or anything else into lines and words */
export function splitText(el: Element, onSplit?: (self: SplitText) => gsap.core.Animation) {
  const heading = HEADING.test(el.tagName)
  return SplitText.create(el, {
    type: heading ? 'lines,words,chars' : 'lines,words',
    mask: 'lines',
    linesClass: textClasses.line,
    wordsClass: textClasses.word,
    charsClass: textClasses.char,
    // Headings: aria-label carries the text. Others: words stay real text, read as normal
    // (an aria-label isn't allowed on paragraphs or spans)
    aria: heading ? 'auto' : 'none',
    autoSplit: true,
    ...(onSplit ? { onSplit } : {}),
  })
}

const all = <T extends Element>(root: Element | Element[], selector: string): T[] =>
  (Array.isArray(root) ? root : [root]).flatMap((r) => [...r.querySelectorAll<T>(selector)])

/** Letters outside the accent word, and the accent word's letters */
export function textLetters(root: Element | Element[]) {
  const chars = all<HTMLElement>(root, `.${textClasses.char}`)
  const accent = chars.filter((c) => c.closest('em'))
  return { plain: chars.filter((c) => !c.closest('em')), accent }
}

/** Words of split paragraphs (not headings, whose words hold letters) */
export function textWords(root: Element | Element[]) {
  return all<HTMLElement>(root, `.${textClasses.word}`).filter(
    (w) => !w.querySelector(`.${textClasses.char}`)
  )
}

export function textKeywords(root: Element | Element[]) {
  return all<HTMLElement>(root, '.keyword')
}

/** gsap.set that skips an empty list (GSAP warns about missing targets) */
function set(targets: HTMLElement[], vars: gsap.TweenVars) {
  if (targets.length) gsap.set(targets, vars)
}

/** Hidden, ready to come in from below (direction 1) or above (-1) */
export function hideText(root: Element | Element[], direction: 1 | -1 = 1) {
  const { plain, accent } = textLetters(root)
  set(plain, { yPercent: 110 * direction, rotateX: -85 * direction, autoAlpha: 0 })
  set(accent, { yPercent: 110 * direction, rotate: -10, autoAlpha: 0 })
  set(textWords(root), { yPercent: 105 * direction, autoAlpha: 0 })
  set(textKeywords(root), { '--kw-line': '0%' })
}

/** Clears everything set by the motion (the text simply shows) */
export function resetText(root: Element | Element[]) {
  const { plain, accent } = textLetters(root)
  set([...plain, ...accent, ...textWords(root)], {
    clearProps: 'transform,opacity,visibility,filter',
  })
  set(textKeywords(root), { '--kw-line': '100%' })
}

/**
 * Brings split text in: letters flip up out of their masks, the accent word drops in with a
 * spring, paragraph words rise, then keyword underlines draw. `speed` > 1 is quicker.
 */
export function textIn(root: Element | Element[], direction: 1 | -1 = 1, speed = 1) {
  const { plain, accent } = textLetters(root)
  const tl = gsap.timeline()
  const d = (s: number) => s / speed
  if (plain.length) {
    tl.fromTo(
      plain,
      {
        yPercent: 110 * direction,
        rotateX: -85 * direction,
        autoAlpha: 0,
        filter: 'blur(8px)',
        transformPerspective: 600,
        transformOrigin: '50% 100% -0.2em',
      },
      {
        yPercent: 0,
        rotateX: 0,
        autoAlpha: 1,
        filter: 'blur(0px)',
        duration: d(1.1),
        stagger: { each: d(0.022), from: 'start' },
        ease: 'expo.out',
        overwrite: 'auto',
        clearProps: 'filter',
      },
      0
    )
  }
  if (accent.length) {
    tl.fromTo(
      accent,
      { yPercent: 110 * direction, rotate: -10, scale: 1.15, autoAlpha: 0, filter: 'blur(6px)' },
      {
        yPercent: 0,
        rotate: 0,
        scale: 1,
        autoAlpha: 1,
        filter: 'blur(0px)',
        duration: d(1.0),
        stagger: { each: d(0.045) },
        ease: 'back.out(1.7)',
        overwrite: 'auto',
        clearProps: 'filter',
      },
      d(0.25)
    )
  }
  const ws = textWords(root)
  if (ws.length) {
    tl.fromTo(
      ws,
      { yPercent: 105 * direction, autoAlpha: 0, filter: 'blur(5px)' },
      {
        yPercent: 0,
        autoAlpha: 1,
        filter: 'blur(0px)',
        duration: d(0.8),
        stagger: { each: d(0.016) },
        ease: 'power3.out',
        overwrite: 'auto',
        clearProps: 'filter',
      },
      d(0.35)
    )
  }
  const kws = textKeywords(root)
  if (kws.length) {
    tl.fromTo(
      kws,
      { '--kw-line': '0%' },
      {
        '--kw-line': '100%',
        duration: d(0.6),
        stagger: d(0.12),
        ease: 'power2.inOut',
        overwrite: 'auto',
      },
      d(0.8)
    )
  }
  return tl
}

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/[]'

/** Decodes short labels (tags, counters) from random characters */
export function scrambleIn(els: HTMLElement[], delay = 0) {
  const tl = gsap.timeline({ delay })
  if (!els.length) return tl
  els.forEach((el, i) => {
    const text = el.dataset.text ?? el.textContent?.trim() ?? ''
    el.dataset.text = text
    tl.to(
      el,
      { duration: 0.8, scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 0.6 }, ease: 'none' },
      i * 0.1
    )
  })
  return tl
}
