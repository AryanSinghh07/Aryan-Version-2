import { Experience } from '~/webgl/Experience'

// Checks for WebGL2 up front, so an unsupported browser gets one quiet warning instead of
// three.js errors. The probe context is released straight away.
function supportsWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch {
    return false
  }
}

// Creates the WebGL Experience once for the whole visit. It renders on the shared GSAP ticker
// after Lenis, so it always sees this frame's scroll position.
// If WebGL is unavailable the site carries on without the 3D layer.
export default defineNuxtPlugin({
  name: 'experience',
  dependsOn: ['gsap', 'lenis'],
  setup() {
    const store = useAppStore()
    let experience: Experience | null = null

    const skip = (reason: unknown) => {
      console.warn('[webgl] WebGL is not available, continuing without 3D', reason)
      document.querySelector('canvas.webgl')?.remove()
      document.documentElement.classList.add('no-webgl')
    }

    if (!supportsWebGL2()) skip('WebGL2 unsupported or disabled')
    else {
      try {
        experience = new Experience(store)
      } catch (error) {
        skip(error)
      }
    }

    store.webgl = !!experience

    if (import.meta.hot) import.meta.hot.dispose(() => experience?.dispose())

    return { provide: { experience } }
  },
})
