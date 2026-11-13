import { Sound } from '~/webgl/audio/Sound'
import type { UiSound } from '~/webgl/audio/Sound'

/** Elements that make a sound on hover and click. `data-sound="none"` opts out. */
const INTERACTIVE = 'a[href], button:not([disabled]), label, [data-sound]'
/** A label and the input inside it both get the click: one sound for the pair, ms */
const CLICK_GAP = 60

function soundFor(el: Element): UiSound | null {
  const choice = el.getAttribute('data-sound')
  if (choice === 'none') return null
  if (choice === 'toggle' || el.getAttribute('role') === 'switch' || el.tagName === 'LABEL') {
    return 'toggle'
  }
  return 'click'
}

// Sound for the whole visit: on while the visitor has chosen it and is past the entry gate.
export default defineNuxtPlugin({
  name: 'sound',
  setup() {
    const store = useAppStore()
    const sound = new Sound()

    watch(
      () => store.sound && store.entered,
      (on) => (on ? sound.enable() : sound.disable()),
      { immediate: true }
    )

    // A returning visitor who saved "sound on" and skipped the gate: browsers only start
    // audio after a gesture, so the first click or key press unlocks it
    const unlock = () => {
      sound.unlock()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)

    // Hover: a soft tick when a mouse moves onto a link or button (not when moving inside it)
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse' || !sound.enabled) return
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE)
      if (!el || el.getAttribute('data-sound') === 'none') return
      if ((e.relatedTarget as Element | null)?.closest?.(INTERACTIVE) === el) return
      sound.play('hover')
    })

    // Click: a tock for links and buttons, a blip for switches and options
    let lastClick = 0
    let lastTarget: Element | null = null
    document.addEventListener(
      'click',
      (e) => {
        if (!sound.enabled) return
        const el = (e.target as Element | null)?.closest?.(INTERACTIVE)
        const name = el ? soundFor(el) : null
        // Same element again straight away = the label/input pair (an input resolves to its label)
        if (!name || (el === lastTarget && e.timeStamp - lastClick < CLICK_GAP)) return
        lastClick = e.timeStamp
        lastTarget = el ?? null
        sound.play(name)
      },
      true
    )

    // Whoosh as full-screen scenes change (home hero, about story) and as pages change
    watch(
      () => store.scene,
      () => {
        if (store.entered && store.route === store.scenesRoute) sound.play('transition')
      }
    )
    watch(
      () => store.route,
      () => {
        if (store.entered) sound.play('transition')
      }
    )

    if (import.meta.hot) import.meta.hot.dispose(() => sound.dispose())

    return { provide: { sound } }
  },
})
